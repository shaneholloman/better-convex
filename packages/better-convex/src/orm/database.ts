/**
 * Database Context Integration
 *
 * Extends Convex GenericDatabaseReader<any> with query builder API
 * Provides ctx.db.query[tableName].findMany/findFirst access
 */

import type {
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from 'convex/server';
import { ConvexDeleteBuilder } from './delete';
import type { EdgeMetadata } from './extractRelationsConfig';
import { ConvexInsertBuilder } from './insert';
import { RelationalQueryBuilder } from './query-builder';
import { defineRelations, type TablesRelationalConfig } from './relations';
import { Brand } from './symbols';
import type { ConvexTable } from './table';
import { ConvexUpdateBuilder } from './update';

/**
 * Database with query builder API
 *
 * @template TSchema - Schema configuration with tables and relations
 *
 * Following Drizzle's pattern: Validate schema BEFORE mapped type to prevent type widening.
 * The conditional check outside the mapped type prevents distributive conditional behavior
 * that causes TSchema[K] to widen to a union of all table types.
 *
 * Pattern from: drizzle-orm/src/pg-core/db.ts lines 50-54
 * Key insight: TSchema[K] must be captured at mapping time, not evaluated in conditionals later.
 */
export type DatabaseWithQuery<TSchema extends TablesRelationalConfig> =
  GenericDatabaseReader<any> & {
    query: TSchema extends Record<string, never>
      ? { error: 'Schema is empty - did you forget to add tables?' }
      : {
          [K in keyof TSchema]: RelationalQueryBuilder<TSchema, TSchema[K]>;
        };
  };

export type DatabaseWithMutations<TSchema extends TablesRelationalConfig> =
  DatabaseWithQuery<TSchema> &
    GenericDatabaseWriter<any> & {
      insert<TTable extends ConvexTable<any>>(
        table: TTable
      ): ConvexInsertBuilder<TTable>;
      update<TTable extends ConvexTable<any>>(
        table: TTable
      ): ConvexUpdateBuilder<TTable>;
      delete<TTable extends ConvexTable<any>>(
        table: TTable
      ): ConvexDeleteBuilder<TTable>;
    };

/**
 * Create database context with query builder API
 *
 * @param db - Convex GenericDatabaseReader<any> (ctx.db)
 * @param schema - Schema configuration object (defineRelations output)
 * @param edgeMetadata - Edge metadata from extractRelationsConfig()
 * @returns Extended database with query property
 *
 * @example
 * import { createDatabase, extractRelationsConfig } from 'better-convex/orm';
 *
 * const schema = { users, posts };
 * const relations = defineRelations(schema, (r) => ({
 *   posts: {
 *     author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
 *   },
 * }));
 * const edges = extractRelationsConfig(relations);
 *
 * export default query({
 *   handler: async (ctx) => {
 *     const db = createDatabase(ctx.db, relations, edges);
 *     const users = await db.query.users.findMany({
 *       with: { posts: true }
 *     });
 *   }
 * });
 */
export function createDatabase<TSchema extends TablesRelationalConfig>(
  db: GenericDatabaseWriter<any>,
  schema: TSchema,
  edgeMetadata: EdgeMetadata[]
): DatabaseWithMutations<TSchema>;
export function createDatabase<TSchema extends TablesRelationalConfig>(
  db: GenericDatabaseReader<any>,
  schema: TSchema,
  edgeMetadata: EdgeMetadata[]
): DatabaseWithQuery<TSchema>;
export function createDatabase<TSchema extends TablesRelationalConfig>(
  db: GenericDatabaseReader<any>,
  schema: TSchema,
  edgeMetadata: EdgeMetadata[]
): DatabaseWithQuery<TSchema> {
  const query: any = {};

  // Create query builder for each table in schema
  for (const [tableName, tableConfig] of Object.entries(schema)) {
    // Filter edges to only those originating from this table
    const tableEdges = edgeMetadata.filter(
      (edge) => edge.sourceTable === tableConfig.name
    );

    query[tableName] = new RelationalQueryBuilder(
      schema,
      tableConfig,
      tableEdges,
      db,
      edgeMetadata // M6.5 Phase 2: Pass all edges for nested relation loading
    );
  }

  const rawInsert = (db as any).insert?.bind(db);
  const rawDelete = (db as any).delete?.bind(db);

  const isConvexTable = (value: unknown): value is ConvexTable<any> =>
    !!value &&
    typeof value === 'object' &&
    (value as any)[Brand] === 'ConvexTable';

  const insert = (...args: any[]) => {
    if (isConvexTable(args[0])) {
      return new ConvexInsertBuilder(db as GenericDatabaseWriter<any>, args[0]);
    }
    if (!rawInsert) {
      throw new Error('Database insert is not available on a reader context.');
    }
    return rawInsert(...args);
  };

  const update = (table: ConvexTable<any>) =>
    new ConvexUpdateBuilder(db as GenericDatabaseWriter<any>, table);

  const deleteBuilder = (...args: any[]) => {
    if (isConvexTable(args[0])) {
      return new ConvexDeleteBuilder(db as GenericDatabaseWriter<any>, args[0]);
    }
    if (!rawDelete) {
      throw new Error('Database delete is not available on a reader context.');
    }
    return rawDelete(...args);
  };

  // Return extended database with query property
  return {
    ...db,
    query,
    insert,
    update,
    delete: deleteBuilder,
  } as DatabaseWithQuery<TSchema>;
}

/**
 * Build schema configuration from raw tables (no relations)
 *
 * Convenience wrapper around defineRelations(schema).
 */
export function buildSchema<TSchema extends Record<string, any>>(
  rawSchema: TSchema
) {
  return defineRelations(rawSchema);
}
