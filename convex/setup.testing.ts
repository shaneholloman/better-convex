import {
  createDatabase,
  type EdgeMetadata,
  extractRelationsConfig,
  type TablesRelationalConfig,
} from 'better-convex/orm';
import type {
  GenericDatabaseWriter,
  SchemaDefinition,
  StorageActionWriter,
} from 'convex/server';
import { convexTest as baseConvexTest } from 'convex-test';
import { relations } from './schema';

export function convexTest<Schema extends SchemaDefinition<any, any>>(
  schema: Schema
) {
  return baseConvexTest(schema);
}

const defaultEdges = extractRelationsConfig(relations);

export const getCtxWithTable = <
  Ctx extends { db: GenericDatabaseWriter<any> },
  Schema extends TablesRelationalConfig,
>(
  ctx: Ctx,
  schema: Schema,
  edges: EdgeMetadata[]
) => ({
  ...ctx,
  table: createDatabase(ctx.db, schema, edges),
});

// Default context wrapper that attaches Better Convex ORM as ctx.table
export async function runCtx<T extends { db: GenericDatabaseWriter<any> }>(
  ctx: T
): Promise<ReturnType<typeof getCtxWithTable<T, typeof relations>>> {
  return getCtxWithTable(ctx, relations, defaultEdges);
}

export type TestCtx = Awaited<ReturnType<typeof runCtx>>;
