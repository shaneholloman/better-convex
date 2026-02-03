/**
 * Database Context Integration
 *
 * Extends Convex GenericDatabaseReader<any> with query builder API
 * Provides ctx.db.query[tableName].findMany/findFirst access
 */

import type { GenericDatabaseReader } from 'convex/server';
import type { EdgeMetadata } from './extractRelationsConfig';
import { RelationalQueryBuilder } from './query-builder';
import { defineRelations, type TablesRelationalConfig } from './relations';

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
 *     author: r.one.users({ from: r.posts.userId, to: r.users._id }),
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

  // Return extended database with query property
  return {
    ...db,
    query,
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
