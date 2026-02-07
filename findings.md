# Findings: ORM Performance Review (2026-02-05)

## Key Findings
- Relation loading in `packages/better-convex/src/orm/query.ts` uses `take(10_000)` and in-memory filtering for one()/many()/through relations, causing full scans and truncation risk.
- Update/Delete builders use unbounded `query.collect()` with post-fetch filtering in `packages/better-convex/src/orm/update.ts` and `packages/better-convex/src/orm/delete.ts`.
- FK cascade handling uses `collect()` in `packages/better-convex/src/orm/mutation-utils.ts` to load referencing rows, risking memory blowups on large fan-out.
- ORM docs lack an operation-by-operation performance checklist mapping each API to scaling characteristics and safe usage.

---

# Findings: Schema Replacement & Test Restructure

## Requirements (Initial)
- Replace native Convex schema in tests with a Drizzle-style SchemaDefinition used by convex-test codegen.
- Provide 100% SchemaDefinition coverage (fields, relations, etc.) for reuse across /test/types.
- Keep API naming close to Drizzle.
- Ensure example/convex/functions/schema.ts exports default SchemaDefinition for codegen.
- Identify schema-independent unit tests and move them to /test.
- Pick best ctx ORM accessor name (ctx.table vs alternative), considering existing ctx.db usage.

## Initial References
- Check convex-ents approach (ctx.table)
- Check local examples: example/convex/lib/ents.ts, example/convex/lib/crpc.ts

## Open Questions
- Which tests are schema-dependent vs independent?
- Exact SchemaDefinition surface needed for full coverage in tests?
- Should ctx accessor be ctx.table, ctx.orm, ctx.qb, or something else?

## Discovery (2026-02-04)
- `test/` currently only has `test/types` (type-only tests). Runtime tests live under `convex/orm/*.test.ts`.
- Schema-dependent runtime tests (using `convexTest`) include: `ordering`, `pagination`, `query-builder`, `where-filtering`, `string-operators`, `mutations`, `relation-loading`.
- Non-`convexTest` unit tests in `convex/orm`:
  - `convex/orm/schema-integration.test.ts` (convexTable + defineSchema compatibility)
  - `convex/orm/relations.test.ts` (defineRelations + extractRelationsConfig behavior)
  These are candidates to move to `/test/` per "unit tests not depending on schema".
- `example/convex/lib/ents.ts` uses `ctx.table` via `entsTableFactory`, matching convex-ents pattern.
- `example/convex/lib/crpc.ts` expects `ctx.table(...)` usage in examples and context typing.
