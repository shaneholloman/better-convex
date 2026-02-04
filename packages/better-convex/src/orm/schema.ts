import type {
  DefineSchemaOptions,
  GenericSchema,
  SchemaDefinition,
} from 'convex/server';
import { defineSchema as defineConvexSchema } from 'convex/server';

/**
 * Better Convex schema definition
 *
 * Wraps Convex's defineSchema to keep schema authoring inside better-convex.
 * Mirrors drizzle's schema-first approach while returning a Convex-compatible
 * SchemaDefinition for codegen and convex-test.
 */
export function defineSchema<
  TSchema extends GenericSchema,
  StrictTableNameTypes extends boolean = true,
>(
  schema: TSchema,
  options?: DefineSchemaOptions<StrictTableNameTypes>
): SchemaDefinition<TSchema, StrictTableNameTypes> {
  return defineConvexSchema(schema, options);
}
