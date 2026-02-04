import type {
  GenericTableIndexes,
  GenericTableSearchIndexes,
  GenericTableVectorIndexes,
  TableDefinition,
} from 'convex/server';
import type { Validator } from 'convex/values';
import { v } from 'convex/values';
import type {
  ColumnBuilder,
  ColumnBuilderBase,
  ColumnBuilderWithTableName,
} from './builders/column-builder';
import { entityKind } from './builders/column-builder';
import {
  createSystemFields,
  type SystemFields,
} from './builders/system-fields';
import type { ConvexIndexBuilder, ConvexIndexBuilderOn } from './indexes';
import { Brand, Columns, TableName } from './symbols';

/**
 * Reserved Convex system table names that cannot be used
 */
const RESERVED_TABLES = new Set(['_storage', '_scheduled_functions']);

/**
 * Valid table name pattern: starts with letter, contains only alphanumeric and underscore
 */
const TABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Validate table name against Convex constraints
 */
function validateTableName(name: string): void {
  if (RESERVED_TABLES.has(name)) {
    throw new Error(
      `Table name '${name}' is reserved. System tables cannot be redefined.`
    );
  }
  if (!TABLE_NAME_REGEX.test(name)) {
    throw new Error(
      `Invalid table name '${name}'. Must start with letter, contain only alphanumeric and underscore.`
    );
  }
}

/**
 * Create a Convex object validator from column builders
 *
 * Extracts .convexValidator from each column and creates v.object({...})
 * This is the core factory that bridges ORM columns to Convex validators.
 *
 * @param columns - Record of column name to column builder
 * @returns Convex object validator
 */
function createValidatorFromColumns(
  columns: Record<string, ColumnBuilder<any, any, any>>
): Validator<any, any, any> {
  const validatorFields = Object.fromEntries(
    Object.entries(columns).map(([key, builder]) => [
      key,
      (builder as any).convexValidator,
    ])
  );
  return v.object(validatorFields);
}

/**
 * Configuration for a Convex table
 * Only supports column builders (text(), integer(), etc.)
 *
 * CRITICAL: No extends constraint on TColumns to avoid type widening (convex-ents pattern)
 */
export interface TableConfig<TName extends string = string, TColumns = any> {
  name: TName;
  columns: TColumns;
}

type ColumnsWithTableName<TColumns, TName extends string> = {
  [K in keyof TColumns]: TColumns[K] extends ColumnBuilderBase
    ? ColumnBuilderWithTableName<TColumns[K], TName>
    : TColumns[K];
};

export type ConvexTableExtraConfigValue = ConvexIndexBuilder;
export type ConvexTableExtraConfig = Record<
  string,
  ConvexTableExtraConfigValue
>;

function isConvexIndexBuilder(value: unknown): value is ConvexIndexBuilder {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [entityKind]?: string })[entityKind] === 'ConvexIndexBuilder'
  );
}

function isConvexIndexBuilderOn(value: unknown): value is ConvexIndexBuilderOn {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [entityKind]?: string })[entityKind] === 'ConvexIndexBuilderOn'
  );
}

function getColumnName(column: ColumnBuilderBase): string {
  const config = (column as { config?: { name?: string } }).config;
  if (!config?.name) {
    throw new Error(
      'Invalid index column: expected a convexTable column builder.'
    );
  }
  return config.name;
}

function getColumnTableName(column: ColumnBuilderBase): string | undefined {
  return (column as { config?: { tableName?: string } }).config?.tableName;
}

function applyExtraConfig<T extends TableConfig>(
  table: ConvexTableImpl<T>,
  config: ConvexTableExtraConfigValue[] | ConvexTableExtraConfig | undefined
) {
  if (!config) return;

  const entries = Array.isArray(config) ? config : Object.values(config);

  for (const entry of entries) {
    if (isConvexIndexBuilderOn(entry)) {
      throw new Error(
        `Invalid index definition on '${table.tableName}'. Did you forget to call .on(...)?`
      );
    }

    if (isConvexIndexBuilder(entry)) {
      const { name, columns, unique, where } = entry.config;

      if (where) {
        throw new Error(
          `Convex does not support partial indexes. Remove .where(...) from index '${name}'.`
        );
      }

      if (unique) {
        // Convex does not enforce unique indexes, but we accept the syntax for Drizzle parity.
      }

      const fields = columns.map((column) => {
        const tableName = getColumnTableName(column);
        if (tableName && tableName !== table.tableName) {
          throw new Error(
            `Index '${name}' references column from '${tableName}', but belongs to '${table.tableName}'.`
          );
        }
        return getColumnName(column);
      });

      table.index(name, fields);
      continue;
    }

    throw new Error(
      `Unsupported extra config value in convexTable('${table.tableName}').`
    );
  }
}

/**
 * ConvexTable implementation class
 * Provides all properties required by Convex's TableDefinition
 *
 * Following convex-ents pattern:
 * - Private fields for indexes (matches TableDefinition structure)
 * - Duck typing (defineSchema only checks object shape)
 * - Direct validator storage (no re-wrapping)
 */
class ConvexTableImpl<T extends TableConfig> {
  /**
   * Required by TableDefinition
   * Public validator property containing v.object({...}) with all column validators
   */
  validator: Validator<Record<string, any>, 'required', any>;

  /**
   * TableDefinition private fields
   * These satisfy structural typing requirements for defineSchema()
   */
  private indexes: any[] = [];
  private stagedDbIndexes: any[] = [];
  private searchIndexes: any[] = [];
  private stagedSearchIndexes: any[] = [];
  private vectorIndexes: any[] = [];
  private stagedVectorIndexes: any[] = [];

  /**
   * Symbol-based metadata storage
   */
  [TableName]: T['name'];
  [Columns]: T['columns'];
  [Brand] = 'ConvexTable' as const;

  /**
   * Public tableName for convenience
   */
  tableName: T['name'];

  constructor(name: T['name'], columns: T['columns']) {
    validateTableName(name);

    this[TableName] = name;

    // Assign column names to builders
    const namedColumns = Object.fromEntries(
      Object.entries(columns).map(([columnName, builder]) => {
        // Set the column name in the builder's config
        (builder as any).config.name = columnName;
        // Track table name for relation typing and runtime introspection
        (builder as any).config.tableName = name;
        return [columnName, builder];
      })
    ) as T['columns'];

    this[Columns] = namedColumns;
    this.tableName = name;

    // Use factory to create validator from columns
    // This extracts .convexValidator from each builder and creates v.object({...})
    this.validator = createValidatorFromColumns(namedColumns as any);
  }

  /**
   * Add index to table
   * Chainable method following Convex pattern
   *
   * @example
   * convexTable('users', { email: text() }).index('by_email', ['email'])
   */
  index<IndexName extends string>(name: IndexName, fields: string[]): this {
    this.indexes.push({ indexDescriptor: name, fields });
    return this;
  }

  /**
   * Add search index to table (Convex-compatible)
   */
  searchIndex<
    IndexName extends string,
    SearchField extends string,
    FilterField extends string = never,
  >(
    name: IndexName,
    config: {
      searchField: SearchField;
      filterFields?: FilterField[];
      staged?: boolean;
    }
  ): this {
    const entry = {
      indexDescriptor: name,
      searchField: config.searchField,
      filterFields: config.filterFields ?? [],
    };
    if (config.staged) {
      this.stagedSearchIndexes.push(entry);
    } else {
      this.searchIndexes.push(entry);
    }
    return this;
  }

  /**
   * Add vector index to table (Convex-compatible)
   */
  vectorIndex<
    IndexName extends string,
    VectorField extends string,
    FilterField extends string = never,
  >(
    name: IndexName,
    config: {
      vectorField: VectorField;
      dimensions: number;
      filterFields?: FilterField[];
      staged?: boolean;
    }
  ): this {
    const entry = {
      indexDescriptor: name,
      vectorField: config.vectorField,
      dimensions: config.dimensions,
      filterFields: config.filterFields ?? [],
    };
    if (config.staged) {
      this.stagedVectorIndexes.push(entry);
    } else {
      this.vectorIndexes.push(entry);
    }
    return this;
  }

  /**
   * Export the contents of this definition for Convex schema tooling.
   * Mirrors convex/server TableDefinition.export().
   */
  export() {
    const documentType = (this.validator as unknown as { json: unknown }).json;
    if (typeof documentType !== 'object') {
      throw new Error(
        'Invalid validator: please make sure that the parameter of `defineTable` is valid (see https://docs.convex.dev/database/schemas)'
      );
    }

    return {
      indexes: this.indexes,
      stagedDbIndexes: this.stagedDbIndexes,
      searchIndexes: this.searchIndexes,
      stagedSearchIndexes: this.stagedSearchIndexes,
      vectorIndexes: this.vectorIndexes,
      stagedVectorIndexes: this.stagedVectorIndexes,
      documentType,
    };
  }
}

/**
 * ConvexTable interface with type branding
 * Extends TableDefinition for schema compatibility
 * Adds phantom types for type inference
 *
 * Following Drizzle pattern: columns are exposed as table properties
 * via mapped type for type safety + Object.assign for runtime access
 */
export interface ConvexTable<
  T extends TableConfig,
  Indexes extends GenericTableIndexes = {},
  SearchIndexes extends GenericTableSearchIndexes = {},
  VectorIndexes extends GenericTableVectorIndexes = {},
> extends TableDefinition<
    Validator<any, any, any>,
    Indexes,
    SearchIndexes,
    VectorIndexes
  > {
  /**
   * Type brand for generic type extraction
   * Uses `declare readonly` to avoid runtime overhead
   */
  readonly _: {
    readonly brand: 'ConvexTable';
    readonly name: T['name'];
    readonly columns: T['columns'];
    readonly inferSelect: import('./types').InferSelectModel<ConvexTable<T>>;
    readonly inferInsert: import('./types').InferInsertModel<ConvexTable<T>>;
  };

  /**
   * Inferred types for select and insert operations
   * Following Drizzle's pattern: $inferSelect and $inferInsert properties
   */
  readonly $inferSelect: import('./types').InferSelectModel<ConvexTable<T>>;
  readonly $inferInsert: import('./types').InferInsertModel<ConvexTable<T>>;

  /**
   * Symbol-based metadata storage
   */
  [TableName]: T['name'];
  [Columns]: T['columns'];
  [Brand]: 'ConvexTable';

  /**
   * Convex schema validator
   */
  validator: Validator<any, any, any>;
  tableName: T['name'];

  // Note: index(), searchIndex(), vectorIndex() methods inherited from TableDefinition
}

/**
 * ConvexTable with columns as properties
 * Following Drizzle's PgTableWithColumns pattern
 * Mapped type makes columns accessible: table.columnName
 * Includes system fields (_id, _creationTime) available on all Convex documents
 */
export type ConvexTableWithColumns<T extends TableConfig> = ConvexTable<T> & {
  [Key in keyof T['columns']]: T['columns'][Key];
} & SystemFields<T['name']>;

/**
 * Create a type-safe Convex table definition
 *
 * Uses Drizzle-style column builders:
 * - text().notNull(), integer(), boolean(), etc.
 *
 * @param name - Table name (must be valid Convex table name)
 * @param columns - Column builders
 * @returns ConvexTable instance compatible with defineSchema()
 *
 * @example
 * import { convexTable, text, integer } from 'better-convex/orm';
 *
 * const users = convexTable('users', {
 *   name: text().notNull(),
 *   email: text().notNull(),
 *   age: integer(),
 * });
 *
 * // Use in schema - works with defineSchema()
 * export default defineSchema({ users });
 *
 * // Extract types
 * type User = InferSelectModel<typeof users>;
 * type NewUser = InferInsertModel<typeof users>;
 *
 * // Chainable indexes
 * const usersWithIndex = convexTable('users', { email: text() })
 *   .index('by_email', ['email']);
 */
export function convexTable<TName extends string, TColumns>(
  name: TName,
  columns: TColumns,
  extraConfig?: (
    self: ColumnsWithTableName<TColumns, TName>
  ) => ConvexTableExtraConfigValue[] | ConvexTableExtraConfig
): ConvexTableWithColumns<{
  name: TName;
  columns: ColumnsWithTableName<TColumns, TName>;
}> {
  // Create raw table instance
  const rawTable = new ConvexTableImpl(name, columns as any);

  // Create system fields (_id, _creationTime)
  const systemFields = createSystemFields(name);

  // Following Drizzle pattern: Object.assign to attach columns AND system fields as properties
  const table = Object.assign(rawTable, rawTable[Columns], systemFields);

  applyExtraConfig(
    rawTable,
    extraConfig?.(rawTable[Columns] as ColumnsWithTableName<TColumns, TName>)
  );

  return table as any;
}
