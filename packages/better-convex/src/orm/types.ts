import type { GenericId } from 'convex/values';
import type {
  Assume,
  KnownKeysOnly,
  ReturnTypeOrValue,
  Simplify,
} from '../internal/types';
import type { ColumnBuilder } from './builders/column-builder';
import type { SystemFields } from './builders/system-fields';
import type { Column } from './filter-expression';
import type {
  One,
  Relation,
  RelationsFilter,
  RelationsRecord,
  TableRelationalConfig,
  TablesRelationalConfig,
} from './relations';
import type { ConvexTable } from './table';

export type {
  TableRelationalConfig,
  TablesRelationalConfig,
} from './relations';

/**
 * Value or array helper (Drizzle pattern).
 */
export type ValueOrArray<T> = T | T[];

/**
 * Type equality check - returns true if X and Y are exactly the same type
 * Pattern from Drizzle: drizzle-orm/src/utils.ts:172
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

/**
 * Merge two object types without using intersection
 * Intersection can cause TypeScript to lose phantom type brands
 * This manually combines keys from both types
 */
export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? B[K]
    : K extends keyof A
      ? A[K]
      : never;
};

/**
 * Extract full document type from a ConvexTable (includes system fields)
 * Uses GetColumnData in 'query' mode to respect notNull brands
 *
 * @example
 * const users = convexTable('users', { name: text().notNull() });
 * type User = InferSelectModel<typeof users>;
 * // → { _id: Id<'users'>, _creationTime: number, name: string }
 *
 * const posts = convexTable('posts', { title: text() }); // nullable
 * type Post = InferSelectModel<typeof posts>;
 * // → { _id: Id<'posts'>, _creationTime: number, title: string | null }
 */
export type InferSelectModel<TTable extends ConvexTable<any>> = Simplify<
  Merge<
    {
      _id: GenericId<TTable['_']['name']>;
      _creationTime: number;
    },
    {
      [K in keyof TTable['_']['columns']]: GetColumnData<
        TTable['_']['columns'][K],
        'query'
      >;
    }
  >
>;

/**
 * Extract insert type from a ConvexTable (excludes system fields)
 *
 * @example
 * const users = convexTable('users', { name: v.string() });
 * type NewUser = InferInsertModel<typeof users>;
 * // → { name: string }
 */
export type InferInsertModel<TTable extends ConvexTable<any>> = Simplify<
  ColumnsToType<TTable['_']['columns']>
>;

/**
 * Extract TypeScript type from a column builder
 * Uses phantom `_` property to get type info
 *
 * @example
 * text().notNull() → string
 * text() → string | null
 * integer().default(0) → number | null (nullable on select, optional on insert)
 */
type BuilderToType<TBuilder extends ColumnBuilder<any, any, any>> =
  TBuilder['_']['notNull'] extends true
    ? TBuilder['_']['data'] // notNull → just the data type
    : TBuilder['_']['data'] | null; // nullable → union with null

/**
 * Extract TypeScript type from a column builder
 * Builders are the only supported API
 */
type ColumnToType<V> =
  V extends ColumnBuilder<any, any, any> ? BuilderToType<V> : never;

/**
 * Extract column data type with mode-based handling (Drizzle pattern)
 *
 * Following Drizzle's GetColumnData pattern for consistent type extraction:
 * - 'raw' mode: Returns base data type without null (for inserts, operator comparisons)
 * - 'query' mode: Respects notNull brand, adds | null for nullable fields (for selects)
 *
 * @template TColumn - Column builder type
 * @template TInferMode - 'query' (default, adds | null) or 'raw' (base type only)
 *
 * @example
 * const name = text().notNull();
 * type NameQuery = GetColumnData<typeof name, 'query'>; // string
 * type NameRaw = GetColumnData<typeof name, 'raw'>; // string
 *
 * const age = integer(); // nullable
 * type AgeQuery = GetColumnData<typeof age, 'query'>; // number | null
 * type AgeRaw = GetColumnData<typeof age, 'raw'>; // number
 */
export type GetColumnData<
  TColumn extends ColumnBuilder<any, any, any>,
  TInferMode extends 'query' | 'raw' = 'query',
> = TInferMode extends 'raw'
  ? TColumn['_']['data'] // Raw mode: just the base data type
  : TColumn['_']['notNull'] extends true
    ? TColumn['_']['data'] // Query mode, notNull: no null union
    : TColumn['_']['data'] | null; // Query mode, nullable: add null

/**
 * Recursively extract types from column builders
 * Only column builders are supported
 *
 * CRITICAL: No extends constraint to avoid type widening
 */
type ColumnsToType<T> =
  T extends Record<string, ColumnBuilder<any, any, any>>
    ? {
        [K in keyof T]: ColumnToType<T[K]>;
      }
    : never;

// ============================================================================
// M3 Query Builder Types
// ============================================================================

/**
 * Query configuration for findMany/findFirst
 *
 * @template TRelationType - 'one' or 'many' determines available options
 * @template TSchema - Full schema configuration
 * @template TTableConfig - Configuration for the queried table
 */
export type DBQueryConfig<
  TRelationType extends 'one' | 'many' = 'one' | 'many',
  _TIsRoot extends boolean = boolean,
  TSchema extends TablesRelationalConfig = TablesRelationalConfig,
  TTableConfig extends TableRelationalConfig = TableRelationalConfig,
> = {
  /**
   * Column selection - pick specific columns to return
   * If omitted, all columns are selected
   */
  columns?:
    | {
        [K in keyof TableColumns<TTableConfig>]?: boolean;
      }
    | undefined;
  /**
   * Relation loading - specify which relations to include
   * Can be `true` for default config or nested config object
   */
  with?:
    | KnownKeysOnly<
        {
          [K in keyof TTableConfig['relations']]?:
            | true
            | DBQueryConfig<
                TTableConfig['relations'][K] extends One<any, any>
                  ? 'one'
                  : 'many',
                false,
                TSchema,
                FindTableByDBName<
                  TSchema,
                  TTableConfig['relations'][K]['targetTableName']
                >
              >
            | undefined;
        },
        TTableConfig['relations']
      >
    | undefined;
  /**
   * Extra computed fields (type-level only for now)
   */
  extras?:
    | Record<string, unknown>
    | ((
        fields: Simplify<
          [TableColumns<TTableConfig>] extends [never]
            ? {}
            : TableColumns<TTableConfig>
        >
      ) => Record<string, unknown>)
    | undefined;
  /**
   * Relation-aware filter object (v1)
   */
  where?: RelationsFilter<TTableConfig, TSchema> | undefined;
  /**
   * Order results - callback or object syntax
   */
  orderBy?: DBQueryConfigOrderBy<TTableConfig> | undefined;
  /** Skip first N results */
  offset?: number | undefined;
} & (TRelationType extends 'many'
  ? {
      /** Limit number of results */
      limit?: number | undefined;
    }
  : {});

/**
 * Filter operators available in where clause
 * Following Drizzle pattern: accept column builders directly, extract types with GetColumnData
 *
 * Operators use 'raw' mode for comparisons (no null union in comparison values)
 * Runtime wraps builders with column() helper for FilterExpression construction
 */
export interface FilterOperators {
  eq<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  ne<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  gt<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  gte<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  lt<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  lte<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    value: GetColumnData<TBuilder, 'raw'>
  ): any;

  inArray<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    values: readonly GetColumnData<TBuilder, 'raw'>[]
  ): any;

  notInArray<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    values: readonly GetColumnData<TBuilder, 'raw'>[]
  ): any;

  arrayContains<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    values: readonly GetColumnData<TBuilder, 'raw'>[]
  ): any;

  arrayContained<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    values: readonly GetColumnData<TBuilder, 'raw'>[]
  ): any;

  arrayOverlaps<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    values: readonly GetColumnData<TBuilder, 'raw'>[]
  ): any;

  isNull<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder extends { _: { notNull: true } } ? never : TBuilder
  ): any;

  isNotNull<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder
  ): any;

  // M5 String Operators (Post-Fetch)
  like<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    pattern: string
  ): any;

  ilike<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    pattern: string
  ): any;

  notLike<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    pattern: string
  ): any;

  notIlike<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    pattern: string
  ): any;

  startsWith<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    prefix: string
  ): any;

  endsWith<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    suffix: string
  ): any;

  contains<TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder,
    substring: string
  ): any;
}

/**
 * Order by clause - represents a single field ordering
 * Following Drizzle pattern for type-safe ordering
 *
 * @template TColumn - Column builder type
 */
export interface OrderByClause<TColumn extends ColumnBuilder<any, any, any>> {
  readonly column: Column<TColumn, string>;
  readonly direction: 'asc' | 'desc';
}

/**
 * Order by input - either a column builder (default ASC)
 * or an explicit order by clause from asc()/desc().
 */
export type OrderByValue<
  TColumn extends ColumnBuilder<any, any, any> = ColumnBuilder<any, any, any>,
> = OrderByClause<TColumn> | TColumn;

/**
 * Order direction helpers
 */
export interface OrderDirection {
  asc: <TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder
  ) => OrderByClause<TBuilder>;
  desc: <TBuilder extends ColumnBuilder<any, any, any>>(
    field: TBuilder
  ) => OrderByClause<TBuilder>;
}

export type DBQueryConfigOrderByCallback<TTable extends ConvexTable<any>> = (
  table: TTable,
  operators: OrderDirection
) => ValueOrArray<OrderByValue> | undefined;

export type DBQueryConfigOrderByObject<
  TColumns extends Record<string, unknown>,
> = {
  [K in keyof TColumns]?: 'asc' | 'desc' | undefined;
};

export type DBQueryConfigOrderBy<TTableConfig extends TableRelationalConfig> =
  | DBQueryConfigOrderByCallback<TTableConfig['table']>
  | DBQueryConfigOrderByObject<TableColumns<TTableConfig>>;

/**
 * Build query result type from configuration
 * Handles column selection and relation loading
 *
 * @template TSchema - Full schema configuration
 * @template TTableConfig - Configuration for queried table
 * @template TConfig - Query configuration (true | config object)
 */

/**
 * Normalize optional columns config to a record for selection logic.
 */
type ColumnsSelection<T> = Assume<
  Exclude<T, undefined>,
  Record<string, unknown>
>;

type TableColumns<TTableConfig extends TableRelationalConfig> =
  TTableConfig['table']['_']['columns'] &
    SystemFields<TTableConfig['table']['_']['name']>;

export type BuildQueryResult<
  TSchema extends TablesRelationalConfig,
  TTableConfig extends TableRelationalConfig,
  TFullSelection,
> = Equal<TFullSelection, true> extends true
  ? InferModelFromColumns<TableColumns<TTableConfig>>
  : TFullSelection extends Record<string, unknown>
    ? Simplify<
        (Exclude<TFullSelection['columns'], undefined> extends Record<
          string,
          unknown
        >
          ? NonUndefinedKeysOnly<
              ColumnsSelection<TFullSelection['columns']>
            > extends never
            ? InferModelFromColumns<TableColumns<TTableConfig>>
            : InferModelFromColumns<{
                [K in Equal<
                  Exclude<
                    ColumnsSelection<
                      TFullSelection['columns']
                    >[keyof ColumnsSelection<TFullSelection['columns']> &
                      keyof TableColumns<TTableConfig>],
                    undefined
                  >,
                  false
                > extends true
                  ? Exclude<
                      keyof TableColumns<TTableConfig>,
                      NonUndefinedKeysOnly<
                        ColumnsSelection<TFullSelection['columns']>
                      >
                    >
                  : {
                      [K in keyof ColumnsSelection<
                        TFullSelection['columns']
                      >]: Equal<
                        ColumnsSelection<TFullSelection['columns']>[K],
                        true
                      > extends true
                        ? K
                        : never;
                    }[keyof ColumnsSelection<TFullSelection['columns']>] &
                      keyof TableColumns<TTableConfig>]: TableColumns<TTableConfig>[K];
              }>
          : InferModelFromColumns<TableColumns<TTableConfig>>) &
          (Exclude<TFullSelection['extras'], undefined> extends
            | Record<string, unknown>
            | ((...args: any[]) => Record<string, unknown>)
            ? {
                [K in NonUndefinedKeysOnly<
                  ReturnTypeOrValue<
                    Exclude<TFullSelection['extras'], undefined>
                  >
                >]: ReturnTypeOrValue<
                  Exclude<TFullSelection['extras'], undefined>
                >[K];
              }
            : {}) &
          (Exclude<TFullSelection['with'], undefined> extends Record<
            string,
            unknown
          >
            ? BuildRelationResult<
                TSchema,
                Exclude<TFullSelection['with'], undefined>,
                TTableConfig['relations']
              >
            : {})
      >
    : never;

/**
 * Build relation result types from `with` configuration
 * Maps each included relation to its result type (T | null for one, T[] for many)
 *
 * Following Drizzle's exact pattern for type inference
 *
 * @template TSchema - Full schema configuration
 * @template TInclude - Relations to include from `with` config
 * @template TRelations - Available relations on the table
 */
export type BuildRelationResult<
  TSchema extends TablesRelationalConfig,
  TInclude extends Record<string, unknown>,
  TRelations extends RelationsRecord,
> = {
  [K in NonUndefinedKeysOnly<TInclude> &
    keyof TRelations]: TRelations[K] extends infer TRel extends Relation<any>
    ? BuildQueryResult<
        TSchema,
        FindTableByDBName<TSchema, TRel['targetTableName']>,
        Assume<TInclude[K], true | Record<string, unknown>>
      > extends infer TResult
      ? TRel extends One<any, any>
        ? TResult | (Equal<TRel['optional'], true> extends true ? null : never)
        : TResult[]
      : never
    : never;
};

/**
 * Extract TypeScript types from column validators
 * Includes system fields for query results
 * Following Drizzle pattern: query results always include system fields
 * Uses GetColumnData in 'query' mode to respect notNull brands
 *
 * CRITICAL: No extends constraint to avoid type widening (convex-ents pattern)
 * CRITICAL: Uses Merge instead of & to preserve NotNull phantom type brands
 */
export type InferModelFromColumns<TColumns> =
  TColumns extends Record<string, ColumnBuilder<any, any, any>>
    ? Simplify<{
        [K in keyof TColumns]: GetColumnData<TColumns[K], 'query'>;
      }>
    : never;

/**
 * Pick specific columns from column builders
 * Used when `columns` config is provided
 * Uses GetColumnData in 'query' mode to respect notNull brands
 *
 * CRITICAL: No extends constraint on TColumns to avoid type widening
 */
export type PickColumns<
  TColumns,
  TSelection extends Record<string, unknown>,
> = TColumns extends Record<string, ColumnBuilder<any, any, any>>
  ? Simplify<{
      [K in keyof TSelection as K extends keyof TColumns
        ? TSelection[K] extends true
          ? K
          : never
        : never]: K extends keyof TColumns
        ? GetColumnData<TColumns[K], 'query'>
        : never;
    }>
  : never;

/**
 * Extract union of all values from an object type
 * Pattern from Drizzle: drizzle-orm/src/relations.ts:145
 */
type ExtractObjectValues<T> = T[keyof T];

/**
 * Find table configuration by database name
 * Pattern from Drizzle: drizzle-orm/src/relations.ts:198-208
 *
 * Uses mapped type with key remapping to avoid `infer` widening.
 * The `as` clause filters to only matching keys, then ExtractObjectValues
 * extracts the single table value without creating unions.
 */
export type FindTableByDBName<
  TSchema extends TablesRelationalConfig,
  TDBName extends string,
> = ExtractObjectValues<{
  [K in keyof TSchema as TSchema[K]['name'] extends TDBName
    ? K
    : never]: TSchema[K];
}>;

/**
 * Filter object keys to only non-undefined values
 * Used to filter `with` config to only included relations
 */
export type NonUndefinedKeysOnly<T> = ExtractObjectValues<{
  [K in keyof T as T[K] extends undefined ? never : K]: K;
}> &
  keyof T;

// ============================================================================
// M7 Mutations - Insert/Update/Delete Types
// ============================================================================

type TableColumnsForTable<TTable extends ConvexTable<any>> =
  TTable['_']['columns'] & SystemFields<TTable['_']['name']>;

export type ReturningSelection<TTable extends ConvexTable<any>> = Record<
  string,
  TableColumnsForTable<TTable>[keyof TableColumnsForTable<TTable>]
>;

export type ReturningResult<
  TSelection extends Record<string, ColumnBuilder<any, any, any>>,
> = Simplify<{
  [K in keyof TSelection]: TSelection[K] extends ColumnBuilder<any, any, any>
    ? GetColumnData<TSelection[K], 'query'>
    : never;
}>;

export type ReturningAll<TTable extends ConvexTable<any>> =
  InferSelectModel<TTable>;

export type MutationReturning =
  | true
  | Record<string, ColumnBuilder<any, any, any>>
  | undefined;

export type MutationResult<
  TTable extends ConvexTable<any>,
  TReturning extends MutationReturning,
> = TReturning extends true
  ? ReturningAll<TTable>[]
  : TReturning extends Record<string, ColumnBuilder<any, any, any>>
    ? ReturningResult<TReturning>[]
    : undefined;

export type InsertValue<TTable extends ConvexTable<any>> =
  InferInsertModel<TTable>;

export type UpdateSet<TTable extends ConvexTable<any>> = Partial<
  InferInsertModel<TTable>
>;
