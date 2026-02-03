/**
 * GelRelationalQuery - Promise-based query builder
 *
 * Implements Drizzle's query pattern for Convex:
 * - Extends QueryPromise for lazy execution
 * - Stores query configuration
 * - Executes Convex queries on await
 */

import type { GenericDatabaseReader } from 'convex/server';
import { type ColumnBuilder, entityKind } from './builders/column-builder';
import type { EdgeMetadata } from './extractRelationsConfig';
import type {
  BinaryExpression,
  ExpressionVisitor,
  FilterExpression,
  LogicalExpression,
  UnaryExpression,
} from './filter-expression';
import {
  column,
  contains,
  endsWith,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isFieldReference,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  notInArray,
  startsWith,
} from './filter-expression';
import { asc, desc } from './order-by';
import { QueryPromise } from './query-promise';
import type {
  DBQueryConfig,
  OrderByClause,
  OrderByValue,
  TableRelationalConfig,
  TablesRelationalConfig,
  ValueOrArray,
} from './types';
import { WhereClauseCompiler } from './where-clause-compiler';

/**
 * Relational query builder with promise-based execution
 *
 * @template TResult - The final result type after execution
 *
 * Pattern from Drizzle: gel-core/query-builders/query.ts:32-62
 */
export class GelRelationalQuery<
  TSchema extends TablesRelationalConfig,
  TTableConfig extends TableRelationalConfig,
  TResult,
> extends QueryPromise<TResult> {
  /**
   * Type brand for result type extraction
   * Critical for Expect<Equal<>> type tests to work correctly
   * Following Drizzle pattern: allows TypeScript to infer result type before await
   */
  declare readonly _: {
    readonly result: TResult;
  };

  constructor(
    private schema: TSchema,
    private tableConfig: TTableConfig,
    private edgeMetadata: EdgeMetadata[],
    private db: GenericDatabaseReader<any>,
    private config: DBQueryConfig<
      'one' | 'many',
      boolean,
      TSchema,
      TTableConfig
    >,
    private mode: 'many' | 'first' | 'paginate',
    private _allEdges?: EdgeMetadata[], // M6.5 Phase 2: All edges for nested loading
    private paginationOpts?: { cursor: string | null; numItems: number } // M6.5 Phase 4: Cursor pagination options
  ) {
    super();
  }

  private _isColumnBuilder(
    value: unknown
  ): value is ColumnBuilder<any, any, any> {
    return (
      !!value &&
      typeof value === 'object' &&
      (value as any)[entityKind] === 'ColumnBuilder'
    );
  }

  private _isOrderByClause(value: unknown): value is OrderByClause<any> {
    return (
      !!value &&
      typeof value === 'object' &&
      'direction' in (value as any) &&
      !!(value as any).column?.columnName
    );
  }

  private _normalizeOrderByValue(value: OrderByValue): OrderByClause<any> {
    if (this._isOrderByClause(value)) {
      return value;
    }
    if (this._isColumnBuilder(value)) {
      return asc(value);
    }
    throw new Error('Invalid orderBy value. Use a column or asc()/desc().');
  }

  private _normalizeOrderBy(
    orderBy: ValueOrArray<OrderByValue> | undefined
  ): OrderByClause<any>[] {
    if (!orderBy) return [];
    const items = Array.isArray(orderBy) ? orderBy : [orderBy];
    return items
      .filter((item): item is OrderByValue => item !== undefined)
      .map((item) => this._normalizeOrderByValue(item));
  }

  private _orderBySpecs(
    orderBy: ValueOrArray<OrderByValue> | undefined
  ): { field: string; direction: 'asc' | 'desc' }[] {
    return this._normalizeOrderBy(orderBy).map((clause) => ({
      field: clause.column.columnName,
      direction: clause.direction,
    }));
  }

  private _compareByOrderSpecs(
    a: any,
    b: any,
    orders: { field: string; direction: 'asc' | 'desc' }[]
  ): number {
    for (const order of orders) {
      const aVal = a[order.field];
      const bVal = b[order.field];

      if (aVal === null || aVal === undefined) {
        if (bVal === null || bVal === undefined) continue;
        return 1;
      }
      if (bVal === null || bVal === undefined) {
        return -1;
      }

      if (aVal < bVal) {
        return order.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return order.direction === 'asc' ? 1 : -1;
      }
    }
    return 0;
  }

  private _getTableConfigByDbName(
    dbName: string
  ): TableRelationalConfig | undefined {
    const tables = Object.values(this.schema) as TableRelationalConfig[];
    return tables.find((table) => table.dbName === dbName);
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
    let needsPostFetchSortForPrimary = false;
    const postFetchOrders = queryConfig.order ?? [];
    const primaryOrder = postFetchOrders[0];
    const hasSecondaryOrders = postFetchOrders.length > 1;

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
      if (primaryOrder) {
        const orderField = primaryOrder.field;
        const indexFields = queryConfig.index.filters.map(
          (f: any) => (f as any).operands[0].fieldName
        );
        // If ordering by same field as index, apply .order()
        if (indexFields.includes(orderField)) {
          query = query.order(primaryOrder.direction);
        } else {
          // Different field - need post-fetch sort
          needsPostFetchSortForPrimary = true;
        }
      }
    } else if (queryConfig.order && primaryOrder) {
      // No WHERE index - check if orderBy field has an index
      const orderField = primaryOrder.field;

      // Special case: _creationTime uses Convex's default index
      if (orderField === '_creationTime') {
        // Default index on _creationTime - no withIndex() needed
        query = query.order(primaryOrder.direction);
      } else {
        const orderIndex = this.edgeMetadata.find((idx) =>
          idx.indexFields.includes(orderField)
        );

        if (orderIndex) {
          // Use orderBy field's index
          query = query.withIndex(orderIndex.indexName, (q: any) => q);
          query = query.order(primaryOrder.direction);
        } else {
          // No index for orderBy field - post-fetch sort
          needsPostFetchSortForPrimary = true;
        }
      }
    }

    usePostFetchSort = needsPostFetchSortForPrimary || hasSecondaryOrders;

    // M6.5 Phase 4: Handle cursor pagination separately
    if (this.mode === 'paginate') {
      // Apply post-filters
      if (queryConfig.postFilters.length > 0) {
        query = query.filter((q: any) => {
          let result = q;
          for (const filter of queryConfig.postFilters) {
            const filterFn = this._toConvexExpression(filter);
            result = filterFn(result);
          }
          return result;
        });
      }

      // Apply ORDER BY for pagination (required for stable cursors)
      if (queryConfig.order && primaryOrder) {
        // Check if ordering was already applied via index (needsPostFetchSortForPrimary would be false)
        if (needsPostFetchSortForPrimary) {
          // Field has no index - pagination can't use custom orderBy
          // Fall back to _creationTime ordering for cursor stability
          console.warn(
            `Pagination: Field '${primaryOrder.field}' has no index. ` +
              'Falling back to _creationTime ordering. ' +
              'Add an index for custom ordering in pagination.'
          );
          query = query.order(
            primaryOrder.direction === 'asc' ? 'asc' : 'desc'
          );
        } else {
          // Ordering already applied via index - query is ready for pagination
          // No additional action needed
        }
        if (hasSecondaryOrders) {
          console.warn(
            'Pagination: Only the first orderBy field is used for cursor ordering. ' +
              'Secondary orderBy fields are applied per page and may be unstable across pages.'
          );
        }
      } else {
        // Default to _creationTime desc if no orderBy specified
        query = query.order('desc');
      }

      // Use Convex native pagination (O(1) performance)
      const paginationResult = await query.paginate({
        cursor: this.paginationOpts?.cursor ?? null,
        numItems: this.paginationOpts?.numItems ?? 20,
      });

      // Load relations for page results if configured
      let pageWithRelations = paginationResult.page;
      if (this.config.with) {
        pageWithRelations = await this._loadRelations(
          paginationResult.page,
          this.config.with
        );
      }

      // Apply column selection if configured
      const selectedPage = this._selectColumns(
        pageWithRelations,
        (this.config as any).columns
      );

      return {
        page: selectedPage,
        continueCursor: paginationResult.continueCursor,
        isDone: paginationResult.isDone,
      } as TResult;
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
    if (typeof offset !== 'number') {
      throw new Error('Only numeric offset is supported in Better Convex ORM.');
    }
    const limit = config.limit ?? 1000; // Default max 1000 to prevent unbounded queries
    if (typeof limit !== 'number') {
      throw new Error('Only numeric limit is supported in Better Convex ORM.');
    }
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
    if (usePostFetchSort && postFetchOrders.length > 0) {
      rows = rows.sort((a: any, b: any) =>
        this._compareByOrderSpecs(a, b, postFetchOrders)
      );
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
    order?: { direction: 'asc' | 'desc'; field: string }[];
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
      order?: { direction: 'asc' | 'desc'; field: string }[];
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
      const orderByValue =
        typeof config.orderBy === 'function'
          ? config.orderBy(this.tableConfig.columns as any, { asc, desc })
          : config.orderBy;

      const orderSpecs = this._orderBySpecs(orderByValue);
      if (orderSpecs.length > 0) {
        result.order = orderSpecs;
      }
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
      proxies[columnName] = column(
        validator as ColumnBuilder<any, any, any>,
        columnName
      );
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
   * Get edge metadata for a target table
   * Helper for recursive relation loading
   */
  private _getTargetTableEdges(tableName: string): EdgeMetadata[] {
    if (!this._allEdges) {
      return [];
    }

    // Filter all edges to find those originating from the target table
    return this._allEdges.filter((edge) => edge.sourceTable === tableName);
  }

  /**
   * Load relations for query results
   * M6.5 Phase 2 implementation: Recursive relation loading with depth limiting
   *
   * @param rows - Array of parent records to load relations for
   * @param withConfig - Relation configuration object
   * @param depth - Current recursion depth (default 0)
   * @param maxDepth - Maximum recursion depth (default 3)
   * @param targetTableEdges - Edge metadata for nested relations (optional, defaults to this.edgeMetadata)
   */
  private async _loadRelations(
    rows: any[],
    withConfig: Record<string, unknown>,
    depth = 0,
    maxDepth = 3,
    targetTableEdges: EdgeMetadata[] = this.edgeMetadata
  ): Promise<any[]> {
    if (!withConfig || rows.length === 0) {
      return rows;
    }

    // Prevent infinite recursion / memory explosion
    if (depth >= maxDepth) {
      return rows;
    }

    // Load all relations in parallel to avoid sequential N+1 queries
    await Promise.all(
      Object.entries(withConfig).map(([relationName, relationConfig]) =>
        this._loadSingleRelation(
          rows,
          relationName,
          relationConfig,
          depth,
          maxDepth,
          targetTableEdges
        )
      )
    );

    return rows;
  }

  /**
   * Load a single relation for all rows
   * Handles both one() and many() cardinality
   * M6.5 Phase 2: Added support for nested relations
   */
  private async _loadSingleRelation(
    rows: any[],
    relationName: string,
    relationConfig: unknown,
    depth: number,
    maxDepth: number,
    targetTableEdges: EdgeMetadata[]
  ): Promise<void> {
    // Find edge metadata for this relation
    const edge = targetTableEdges.find((e) => e.edgeName === relationName);

    if (!edge) {
      throw new Error(
        `Relation '${relationName}' not found in table '${this.tableConfig.dbName}'. ` +
          `Available relations: ${targetTableEdges.map((e) => e.edgeName).join(', ')}`
      );
    }

    // Load based on cardinality
    if (edge.cardinality === 'one') {
      await this._loadOneRelation(
        rows,
        relationName,
        edge,
        relationConfig,
        depth,
        maxDepth
      );
    } else {
      await this._loadManyRelation(
        rows,
        relationName,
        edge,
        relationConfig,
        depth,
        maxDepth
      );
    }
  }

  /**
   * Load one() relation (many-to-one or one-to-one)
   * Example: posts.user where posts.userId → users._id
   * M6.5 Phase 2: Added support for nested relations
   */
  private async _loadOneRelation(
    rows: any[],
    relationName: string,
    edge: EdgeMetadata,
    relationConfig: unknown,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    // Collect unique target IDs
    const targetIds = [
      ...new Set(
        rows
          .map((row) => row[edge.fieldName])
          .filter((id): id is string => id !== null)
      ),
    ];

    if (targetIds.length === 0) {
      // All rows have null foreign key
      for (const row of rows) {
        row[relationName] = null;
      }
      return;
    }

    // Batch load all target records
    // TODO M6.5 Phase 3: Use withIndex for efficient lookup
    const allTargets = await this.db.query(edge.targetTable).take(10_000);

    // Filter to only targets we need (in-memory filter since Convex lacks .in() operator)
    const targets = allTargets.filter((t) =>
      targetIds.includes(t._id as string)
    );

    // M6.5 Phase 2: Recursively load nested relations if configured
    if (
      relationConfig &&
      typeof relationConfig === 'object' &&
      'with' in relationConfig
    ) {
      // Get edge metadata for the target table (not the current table)
      const targetTableEdges = this._getTargetTableEdges(edge.targetTable);
      await this._loadRelations(
        targets,
        (relationConfig as any).with,
        depth + 1,
        maxDepth,
        targetTableEdges
      );
    }

    // Create ID → record mapping for O(1) lookup
    const targetsById = new Map(targets.map((t) => [t._id as string, t]));

    // Map relations back to parent rows
    for (const row of rows) {
      const targetId = row[edge.fieldName] as string | null;
      row[relationName] = targetId ? (targetsById.get(targetId) ?? null) : null;
    }
  }

  /**
   * Load many() relation (one-to-many)
   * Example: users.posts where posts.userId → users._id
   *
   * For many() relations, the foreign key is in the target table, not source.
   * We use the inverse edge's fieldName to find the FK field in target table.
   * M6.5 Phase 2: Added support for nested relations
   * M6.5 Phase 3: Added support for where filters, orderBy, and per-parent limit
   */
  private async _loadManyRelation(
    rows: any[],
    relationName: string,
    edge: EdgeMetadata,
    relationConfig: unknown,
    depth: number,
    maxDepth: number
  ): Promise<void> {
    // Collect all source IDs
    const sourceIds = rows.map((row) => row._id as string);

    if (sourceIds.length === 0) {
      return;
    }

    // For many() relations, find the FK field in target table using inverse edge
    // Edge: users.posts (many) → Inverse: posts.user (one) with fieldName="userId"
    let targetForeignKeyField: string;
    if (edge.inverseEdge) {
      // Use inverse edge's fieldName (e.g., "userId" in posts table)
      targetForeignKeyField = edge.inverseEdge.fieldName;
    } else {
      // Fallback: convention-based (sourceTableName + "Id")
      // This handles unidirectional many() relations without inverse
      targetForeignKeyField = `${edge.sourceTable.slice(0, -1)}Id`; // "users" → "userId"
    }

    // Batch load all target records that reference any source
    // TODO M6.5 Phase 3: Use withIndex for efficient lookup
    const allTargets = await this.db.query(edge.targetTable).take(10_000);

    // Filter to only targets that reference our source IDs
    let targets = allTargets.filter((t) =>
      sourceIds.includes(t[targetForeignKeyField] as string)
    );

    // M6.5 Phase 3: Apply where filters if present
    if (
      relationConfig &&
      typeof relationConfig === 'object' &&
      'where' in relationConfig &&
      typeof (relationConfig as any).where === 'function'
    ) {
      const whereFilter = (relationConfig as any).where;
      // Apply filter to each target (in-memory filtering)
      targets = targets.filter((target) => {
        try {
          // Create a mock query builder for filter evaluation
          const mockQueryBuilder = {
            eq: (field: any, value: any) => target[field] === value,
            neq: (field: any, value: any) => target[field] !== value,
            gt: (field: any, value: any) => target[field] > value,
            gte: (field: any, value: any) => target[field] >= value,
            lt: (field: any, value: any) => target[field] < value,
            lte: (field: any, value: any) => target[field] <= value,
            field: (name: string) => name,
          };
          return whereFilter(target, mockQueryBuilder);
        } catch {
          return true; // Keep target if filter evaluation fails
        }
      });
    }

    // M6.5 Phase 3: Apply orderBy if present
    if (
      relationConfig &&
      typeof relationConfig === 'object' &&
      'orderBy' in relationConfig
    ) {
      let orderByValue = (relationConfig as any).orderBy;
      if (typeof orderByValue === 'function') {
        const targetTableConfig = this._getTableConfigByDbName(
          edge.targetTable
        );
        if (targetTableConfig) {
          orderByValue = orderByValue(targetTableConfig.columns, { asc, desc });
        } else {
          orderByValue = undefined;
        }
      }

      const orderSpecs = this._orderBySpecs(orderByValue);
      if (orderSpecs.length > 0) {
        targets.sort((a, b) => this._compareByOrderSpecs(a, b, orderSpecs));
      }
    }

    // M6.5 Phase 2: Recursively load nested relations if configured
    if (
      relationConfig &&
      typeof relationConfig === 'object' &&
      'with' in relationConfig
    ) {
      // Get edge metadata for the target table (not the current table)
      const targetTableEdges = this._getTargetTableEdges(edge.targetTable);
      await this._loadRelations(
        targets,
        (relationConfig as any).with,
        depth + 1,
        maxDepth,
        targetTableEdges
      );
    }

    // M6.5 Phase 3: Extract limit for per-parent limiting
    const perParentLimit =
      relationConfig &&
      typeof relationConfig === 'object' &&
      'limit' in relationConfig
        ? (relationConfig as any).limit
        : undefined;
    if (perParentLimit !== undefined && typeof perParentLimit !== 'number') {
      throw new Error('Only numeric limit is supported in Better Convex ORM.');
    }

    // Group targets by parent ID
    const byParentId = new Map<string, any[]>();
    for (const target of targets) {
      const parentId = target[targetForeignKeyField] as string;
      if (!byParentId.has(parentId)) {
        byParentId.set(parentId, []);
      }
      byParentId.get(parentId)!.push(target);
    }

    // M6.5 Phase 3: Apply per-parent limit
    // Each parent gets up to N children, not N children total
    if (perParentLimit !== undefined && typeof perParentLimit === 'number') {
      for (const [parentId, children] of byParentId.entries()) {
        if (children.length > perParentLimit) {
          byParentId.set(parentId, children.slice(0, perParentLimit));
        }
      }
    }

    // Map relations back to parent rows
    for (const row of rows) {
      const rowId = row._id as string;
      row[relationName] = byParentId.get(rowId) ?? [];
    }
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
