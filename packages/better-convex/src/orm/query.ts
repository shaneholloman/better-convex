/**
 * GelRelationalQuery - Promise-based query builder
 *
 * Implements Drizzle's query pattern for Convex:
 * - Extends QueryPromise for lazy execution
 * - Stores query configuration
 * - Executes Convex queries on await
 */

import type { GenericDatabaseReader } from 'convex/server';
import type { EdgeMetadata } from './extractRelationsConfig';
import type {
  BinaryExpression,
  ExpressionVisitor,
  FilterExpression,
  LogicalExpression,
  UnaryExpression,
} from './filter-expression';
import { column, isFieldReference } from './filter-expression';
import { QueryPromise } from './query-promise';
import type {
  DBQueryConfig,
  TableRelationalConfig,
  TablesRelationalConfig,
} from './types';
import { WhereClauseCompiler } from './where-clause-compiler';

/**
 * Relational query builder with promise-based execution
 *
 * @template TResult - The final result type after execution
 *
 * Pattern from Drizzle: gel-core/query-builders/query.ts:32-62
 */
export class GelRelationalQuery<TResult> extends QueryPromise<TResult> {
  /**
   * Type brand for result type extraction
   * Critical for Expect<Equal<>> type tests to work correctly
   * Following Drizzle pattern: allows TypeScript to infer result type before await
   */
  declare readonly _: {
    readonly result: TResult;
  };

  constructor(
    _fullSchema: TablesRelationalConfig,
    private tableConfig: TableRelationalConfig,
    private edgeMetadata: EdgeMetadata[],
    private db: GenericDatabaseReader<any>,
    private config: DBQueryConfig<
      'one' | 'many',
      TablesRelationalConfig,
      TableRelationalConfig
    >,
    private mode: 'many' | 'first'
  ) {
    super();
  }

  /**
   * Evaluate a filter expression against a fetched row
   * Used for post-fetch filtering (string operators, etc.)
   */
  private _evaluatePostFetchFilter(
    row: any,
    filter: FilterExpression<boolean>
  ): boolean {
    if (filter.type === 'binary') {
      const [field, value] = filter.operands;
      if (!isFieldReference(field)) {
        throw new Error(
          'Binary expression must have FieldReference as first operand'
        );
      }

      const fieldName = field.fieldName;
      const fieldValue = row[fieldName];

      switch (filter.operator) {
        case 'like': {
          const pattern = value as string;
          if (typeof fieldValue !== 'string') return false;

          // Pattern: %text% → includes, text% → startsWith, %text → endsWith
          if (pattern.startsWith('%') && pattern.endsWith('%')) {
            const substring = pattern.slice(1, -1);
            return fieldValue.includes(substring);
          }
          if (pattern.startsWith('%')) {
            const suffix = pattern.slice(1);
            return fieldValue.endsWith(suffix);
          }
          if (pattern.endsWith('%')) {
            const prefix = pattern.slice(0, -1);
            return fieldValue.startsWith(prefix);
          }
          return fieldValue === pattern;
        }
        case 'ilike': {
          const pattern = value as string;
          if (typeof fieldValue !== 'string') return false;

          const lowerValue = fieldValue.toLowerCase();
          const lowerPattern = pattern.toLowerCase();

          if (lowerPattern.startsWith('%') && lowerPattern.endsWith('%')) {
            const substring = lowerPattern.slice(1, -1);
            return lowerValue.includes(substring);
          }
          if (lowerPattern.startsWith('%')) {
            const suffix = lowerPattern.slice(1);
            return lowerValue.endsWith(suffix);
          }
          if (lowerPattern.endsWith('%')) {
            const prefix = lowerPattern.slice(0, -1);
            return lowerValue.startsWith(prefix);
          }
          return lowerValue === lowerPattern;
        }
        case 'startsWith': {
          if (typeof fieldValue !== 'string') return false;
          return fieldValue.startsWith(value as string);
        }
        case 'endsWith': {
          if (typeof fieldValue !== 'string') return false;
          return fieldValue.endsWith(value as string);
        }
        case 'contains': {
          if (typeof fieldValue !== 'string') return false;
          return fieldValue.includes(value as string);
        }
        // Basic operators fallback (shouldn't reach here normally)
        case 'eq':
          return fieldValue === value;
        case 'ne':
          return fieldValue !== value;
        case 'gt':
          return fieldValue > value;
        case 'gte':
          return fieldValue >= value;
        case 'lt':
          return fieldValue < value;
        case 'lte':
          return fieldValue <= value;
        case 'inArray': {
          const arr = value as any[];
          return arr.includes(fieldValue);
        }
        case 'notInArray': {
          const arr = value as any[];
          return !arr.includes(fieldValue);
        }
        default:
          throw new Error(
            `Unsupported post-fetch operator: ${filter.operator}`
          );
      }
    }

    if (filter.type === 'unary') {
      const [operand] = filter.operands;

      // Handle null checks on field references
      if (isFieldReference(operand)) {
        const fieldName = operand.fieldName;
        const fieldValue = row[fieldName];

        switch (filter.operator) {
          case 'isNull':
            return fieldValue === null || fieldValue === undefined;
          case 'isNotNull':
            return fieldValue !== null && fieldValue !== undefined;
          default:
            throw new Error(`Unsupported unary operator: ${filter.operator}`);
        }
      }

      // Handle NOT operator on nested expressions
      if (filter.operator === 'not') {
        return !this._evaluatePostFetchFilter(
          row,
          operand as FilterExpression<boolean>
        );
      }

      throw new Error(
        'Unary expression must have FieldReference or FilterExpression as operand'
      );
    }

    if (filter.type === 'logical') {
      if (filter.operator === 'and') {
        return filter.operands.every((f) =>
          this._evaluatePostFetchFilter(row, f)
        );
      }
      if (filter.operator === 'or') {
        return filter.operands.some((f) =>
          this._evaluatePostFetchFilter(row, f)
        );
      }
    }

    throw new Error(`Unsupported filter type for post-fetch: ${filter.type}`);
  }

  /**
   * Execute the query and return results
   * Phase 4 implementation with WhereClauseCompiler integration
   */
  async execute(): Promise<TResult> {
    const queryConfig = this._toConvexQuery();

    // Start Convex query
    let query: any = this.db.query(queryConfig.table);

    // M5: Index-aware ordering strategy
    // 1. If WHERE uses an index AND orderBy field matches → use .order() on that index
    // 2. If orderBy field has index AND no WHERE index → use orderBy index with .order()
    // 3. Otherwise → post-fetch sort (no index available)
    let usePostFetchSort = false;
    let postFetchOrderField: string | undefined;
    let postFetchOrderDirection: 'asc' | 'desc' | undefined;

    // Apply index if selected for WHERE filtering
    if (queryConfig.index) {
      const indexConfig = queryConfig.index;
      query = query.withIndex(indexConfig.name, (q: any) => {
        // Apply index filters (eq operations on indexed fields)
        let indexQuery = q;
        for (const filter of indexConfig.filters) {
          indexQuery = this._applyFilterToQuery(indexQuery, filter);
        }
        return indexQuery;
      });

      // Check if orderBy field matches WHERE index
      if (queryConfig.order) {
        const orderField = queryConfig.order.field;
        const indexFields = queryConfig.index.filters.map(
          (f: any) => (f as any).operands[0].fieldName
        );
        // If ordering by same field as index, apply .order()
        if (indexFields.includes(orderField)) {
          query = query.order(queryConfig.order.direction);
        } else {
          // Different field - need post-fetch sort
          usePostFetchSort = true;
          postFetchOrderField = orderField;
          postFetchOrderDirection = queryConfig.order.direction;
        }
      }
    } else if (queryConfig.order) {
      // No WHERE index - check if orderBy field has an index
      const orderField = queryConfig.order.field;

      // Special case: _creationTime uses Convex's default index
      if (orderField === '_creationTime') {
        // Default index on _creationTime - no withIndex() needed
        query = query.order(queryConfig.order.direction);
      } else {
        const orderIndex = this.edgeMetadata.find((idx) =>
          idx.indexFields.includes(orderField)
        );

        if (orderIndex) {
          // Use orderBy field's index
          query = query.withIndex(orderIndex.indexName, (q: any) => q);
          query = query.order(queryConfig.order.direction);
        } else {
          // No index for orderBy field - post-fetch sort
          usePostFetchSort = true;
          postFetchOrderField = orderField;
          postFetchOrderDirection = queryConfig.order.direction;
        }
      }
    }

    // Apply post-filters
    if (queryConfig.postFilters.length > 0) {
      query = query.filter((q: any) => {
        // Combine all post-filters with AND logic
        let result = q;
        for (const filter of queryConfig.postFilters) {
          const filterFn = this._toConvexExpression(filter);
          result = filterFn(result);
        }
        return result;
      });
    }

    // Execute query with limit - .take() returns Promise<Doc[]>
    const config = this.config as any;
    // M4.5: Offset pagination via post-fetch slicing
    // Convex doesn't have skip() - fetch offset + limit rows, then slice
    const offset = config.offset ?? 0;
    const limit = config.limit ?? 1000; // Default max 1000 to prevent unbounded queries
    const fetchLimit = offset > 0 ? offset + limit : limit;
    let rows = await query.take(fetchLimit);

    // Apply offset slicing if needed
    if (offset > 0) {
      rows = rows.slice(offset);
    }

    // M5: Apply post-fetch string operator filters
    // String operators can't work in Convex filter context, apply after fetch
    if (queryConfig.postFilters.length > 0) {
      rows = rows.filter((row: any) =>
        queryConfig.postFilters.every((filter) =>
          this._evaluatePostFetchFilter(row, filter)
        )
      );
    }

    // Apply post-fetch sort if needed
    if (usePostFetchSort && postFetchOrderField && postFetchOrderDirection) {
      const field = postFetchOrderField;
      const direction = postFetchOrderDirection;
      rows = rows.sort((a: any, b: any) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1; // nulls last
        if (bVal === null || bVal === undefined) return -1;
        const cmp = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? cmp : -cmp;
      });
    }

    // Load relations if configured
    let rowsWithRelations = rows;
    if (this.config.with) {
      rowsWithRelations = await this._loadRelations(rows, this.config.with);
    }

    // Apply column selection if configured
    const selectedRows = this._selectColumns(
      rowsWithRelations,
      (this.config as any).columns
    );

    // Return based on mode
    if (this.mode === 'first') {
      return selectedRows[0] as TResult;
    }

    return selectedRows as TResult;
  }

  /**
   * Convert query config to Convex query parameters
   * Phase 4 implementation with WhereClauseCompiler
   */
  private _toConvexQuery(): {
    table: string;
    index?: { name: string; filters: FilterExpression<boolean>[] };
    postFilters: FilterExpression<boolean>[];
    order?: { direction: 'asc' | 'desc'; field: string };
  } {
    const config = this.config as any;

    // Initialize compiler for this table
    const compiler = new WhereClauseCompiler(
      this.tableConfig.dbName,
      this.edgeMetadata
    );

    // Compile where clause to FilterExpression (if present)
    let whereExpression: FilterExpression<boolean> | undefined;
    if (config.where) {
      // Call user's where function to get FilterExpression
      whereExpression = config.where(
        this._createColumnProxies(),
        this._createOperators()
      );
    }

    // Use compiler to split filters and select index
    const compiled = compiler.compile(whereExpression);

    // Build query config
    const result: {
      table: string;
      index?: { name: string; filters: FilterExpression<boolean>[] };
      postFilters: FilterExpression<boolean>[];
      order?: { direction: 'asc' | 'desc'; field: string };
    } = {
      table: this.tableConfig.dbName,
      postFilters: compiled.postFilters,
    };

    // Add index if selected
    if (compiled.selectedIndex && compiled.indexFilters.length > 0) {
      result.index = {
        name: compiled.selectedIndex.indexName,
        filters: compiled.indexFilters,
      };
    }

    // Compile orderBy (M5 implementation)
    if (config.orderBy) {
      // orderBy is now directly an OrderByClause from asc()/desc()
      const orderByClause = config.orderBy;
      result.order = {
        direction: orderByClause.direction,
        field: orderByClause.column.columnName,
      };
    }

    return result;
  }

  /**
   * Create column wrappers for where clause
   * Used by where() function to pass columns to operators
   * Following Drizzle pattern: pass raw columns (validator + name) to operators
   */
  private _createColumnProxies(): typeof this.tableConfig.columns {
    const proxies: Record<string, any> = {};
    for (const [columnName, validator] of Object.entries(
      this.tableConfig.columns
    )) {
      // Each column proxy is a Column wrapper with validator + name
      proxies[columnName] = column(validator, columnName);
    }
    return proxies as any;
  }

  /**
   * Create operator functions that build FilterExpression trees
   * Used by where() function to construct filter expressions
   *
   * Since _createColumnProxies() already wraps columns with column(),
   * just return the raw operators from filter-expression.ts
   */
  private _createOperators(): any {
    // Import operators dynamically to avoid circular dependency
    const {
      eq,
      ne,
      gt,
      gte,
      lt,
      lte,
      inArray,
      notInArray,
      isNull,
      isNotNull,
      like,
      ilike,
      startsWith,
      endsWith,
      contains,
    } = require('./filter-expression');

    // Return operators as-is - they already expect Column wrappers
    // which _createColumnProxies() provides (cast to raw builder type)
    return {
      eq,
      ne,
      gt,
      gte,
      lt,
      lte,
      inArray,
      notInArray,
      isNull,
      isNotNull,
      like,
      ilike,
      startsWith,
      endsWith,
      contains,
    };
  }

  /**
   * Apply a single filter expression to a Convex query builder
   * Used for index filters (eq operations)
   */
  private _applyFilterToQuery(
    query: any,
    filter: FilterExpression<boolean>
  ): any {
    // For index filters, we only handle binary eq expressions
    if (filter.type === 'binary' && filter.operator === 'eq') {
      const [field, value] = filter.operands;
      if (isFieldReference(field)) {
        return query.eq(field.fieldName, value);
      }
    }
    return query;
  }

  /**
   * Convert FilterExpression to Convex filter function
   * Uses visitor pattern to traverse expression tree
   */
  private _toConvexExpression(
    expression: FilterExpression<boolean>
  ): (q: any) => any {
    const visitor: ExpressionVisitor<(q: any) => any> = {
      visitBinary: (expr: BinaryExpression) => {
        const [field, value] = expr.operands;
        if (!isFieldReference(field)) {
          throw new Error(
            'Binary expression must have FieldReference as first operand'
          );
        }

        const fieldName = field.fieldName;

        // Map our operators to Convex operators
        switch (expr.operator) {
          case 'eq':
            return (q: any) => q.eq(q.field(fieldName), value);
          case 'ne':
            return (q: any) => q.neq(q.field(fieldName), value);
          case 'gt':
            return (q: any) => q.gt(q.field(fieldName), value);
          case 'gte':
            return (q: any) => q.gte(q.field(fieldName), value);
          case 'lt':
            return (q: any) => q.lt(q.field(fieldName), value);
          case 'lte':
            return (q: any) => q.lte(q.field(fieldName), value);
          case 'inArray': {
            // inArray: field must be in the provided array
            const values = value as any[];
            return (q: any) => {
              // Convert to OR of eq operations
              const conditions = values.map((v) => q.eq(q.field(fieldName), v));
              return conditions.reduce((acc, cond) => q.or(acc, cond));
            };
          }
          case 'notInArray': {
            // notInArray: field must NOT be in the provided array
            const values = value as any[];
            return (q: any) => {
              // Convert to AND of neq operations
              const conditions = values.map((v) =>
                q.neq(q.field(fieldName), v)
              );
              return conditions.reduce((acc, cond) => q.and(acc, cond));
            };
          }
          // M5: String operators (post-filter implementation)
          case 'like':
          case 'ilike':
          case 'startsWith':
          case 'endsWith':
          case 'contains':
            // String operators require post-fetch filtering
            // They can't work in Convex filter context (no JavaScript string methods on field expressions)
            // These are handled in _evaluatePostFetchFilter after rows are fetched
            return () => true; // No-op in Convex filter, will be applied post-fetch
          default:
            throw new Error(`Unsupported binary operator: ${expr.operator}`);
        }
      },

      visitLogical: (expr: LogicalExpression) => {
        // Recursively convert operands
        const operandFns = expr.operands.map((op) => op.accept(visitor));

        if (expr.operator === 'and') {
          return (q: any) => {
            let result = operandFns[0](q);
            for (let i = 1; i < operandFns.length; i++) {
              result = q.and(result, operandFns[i](q));
            }
            return result;
          };
        }
        if (expr.operator === 'or') {
          return (q: any) => {
            let result = operandFns[0](q);
            for (let i = 1; i < operandFns.length; i++) {
              result = q.or(result, operandFns[i](q));
            }
            return result;
          };
        }

        throw new Error(`Unsupported logical operator: ${expr.operator}`);
      },

      visitUnary: (expr: UnaryExpression) => {
        const operand = expr.operands[0];

        if (expr.operator === 'not') {
          // not() operates on FilterExpression
          const operandFn = (operand as FilterExpression<boolean>).accept(
            visitor
          );
          return (q: any) => q.not(operandFn(q));
        }

        if (expr.operator === 'isNull') {
          // isNull() operates on FieldReference
          if (!isFieldReference(operand)) {
            throw new Error('isNull must operate on a field reference');
          }
          const fieldName = operand.fieldName;
          return (q: any) => q.eq(q.field(fieldName), null);
        }

        if (expr.operator === 'isNotNull') {
          // isNotNull() operates on FieldReference
          if (!isFieldReference(operand)) {
            throw new Error('isNotNull must operate on a field reference');
          }
          const fieldName = operand.fieldName;
          return (q: any) => q.neq(q.field(fieldName), null);
        }

        throw new Error(`Unsupported unary operator: ${expr.operator}`);
      },
    };

    return expression.accept(visitor);
  }

  /**
   * Load relations for query results
   * Phase 4 implementation
   */
  private async _loadRelations(
    rows: any[],
    _withConfig: Record<string, unknown>
  ): Promise<any[]> {
    // Phase 4: Full implementation coming
    // For now, return rows unchanged
    // TODO: Implement batch relation loading with Promise.all
    return rows;
  }

  /**
   * Select specific columns from rows
   * Phase 5 implementation
   */
  private _selectColumns(
    rows: any[],
    columnsConfig?: Record<string, boolean>
  ): any[] {
    if (!columnsConfig) {
      // No column selection - return all columns
      return rows;
    }

    // Pick only selected columns
    return rows.map((row) => {
      const selected: any = {};
      for (const [key, include] of Object.entries(columnsConfig)) {
        if (include && key in row) {
          selected[key] = row[key];
        }
      }
      return selected;
    });
  }
}
