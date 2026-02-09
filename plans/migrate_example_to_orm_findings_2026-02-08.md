# Findings: `example/` -> Better-Convex ORM Migration (2026-02-08)

## Requirements (From User)
- Migrate `example/` so it does not use `ctx.db` or `ctx.table` anywhere in application code.
- Uninstall `convex-ents` from `example/`.
- Track any gaps/parity issues discovered vs:
  - `www/content/docs/db/orm/migrate-from-ents.mdx`
  - `www/content/docs/db/orm/migrate-from-convex.mdx`
- If gaps exist, improve ORM and/or docs.

## Current State (Post-Migration Verification)
- `rg -n "\\bctx\\.db\\b|\\bctx\\.table\\(|convex-ents" example/` returns no matches.
- `bun --cwd example typecheck` passes.
- `bun --cwd example lint` passes.
- `bun --cwd example codegen` passes (after fixing Better Convex CLI/codegen issues; see "Hiccups" below).
- `convex-ents` removed from `example/package.json`; `example/convex/lib/ents.ts` deleted.

## Pre-Migration Inventory (Historical)
- `ctx.table(...)` usages in `example/convex/**`: ~124 occurrences.
- `ctx.db` usages in `example/convex/**`: 6 occurrences, but only 3 were “real” code paths:
  - `example/convex/functions/projects.ts` used `stream(ctx.db, schema)` (2 occurrences).
  - `example/convex/functions/user.ts` used `ctx.db.patch(...)` (1 occurrence).
  - Remaining `ctx.db` mentions were in `example/convex/README.md`.
- `convex-ents` used to be installed in `example/package.json` (`convex-ents@0.18.1`).

## Ents Schema: Tables Present
`example/convex/functions/schema.ts` defines:
- Better Auth: `session`, `account`, `verification`, `jwks`
- Orgs: `organization`, `member`, `invitation`
- App: `user`, `todos`, `projects`, `tags`, `todoComments`
- Polar: `subscriptions`
- Join tables: `projectMembers`, `todoTags`, `commentReplies`

## Index/Search Names Referenced by Code (Preserve These)
Extracted from `ctx.table('x', 'indexName', ...)`, `ctx.table('x').get('indexName', ...)`, and `.search('searchIndex', ...)` usage:

GET(index):
- `member.get('organizationId_userId')` (auth session org role lookup)
- `subscriptions.get('organizationId_status')` (active org subscription)
- `subscriptions.get('subscriptionId')` (polar subscription upsert)
- `user.get('customerId')` (polar customer lookup)
- `user.get('email')` (admin bootstrap, seed, reset)
- `organization.get('slug')` (org lookup)

TABLE(index):
- `invitation`:
  - `email`
  - `email_organizationId_status`
  - `organizationId_status`
- `member`:
  - `organizationId_role`
  - `organizationId_userId`
  - `userId`
- `projectMembers`:
  - `projectId`
  - `projectId_userId`
  - `userId`
- `projects`:
  - `ownerId`
- `subscriptions`:
  - `organizationId_status`
- `tags`:
  - `createdBy`
- `todos`:
  - `projectId`
  - `userId`

SEARCH(index):
- `todos.search('search_title_description')`

## High-Risk / Tricky Migrations
- **Stream-based pagination filtering**:
  - `example/convex/functions/projects.ts` uses `stream(ctx.db, schema).query('projects').filterWith(async ...)` + `.paginate(...)`.
  - ORM does not support async predicates in a single query; rewrite will likely be 2-step:
    - precompute allowed project IDs (member + owner)
    - use predicate `where` with an explicit `index: { name }` plan + bounded `paginate.maximumRowsRead`
    - or use an indexed `where` + `in` filter and accept read-amplification.
- **Ent edge traversal and helpers**:
  - Widespread `row.edge('rel')`, `edgeX`, `edge('rel').has(...)`, `edge('rel').map(...)`.
  - ORM equivalent is `with:` eager loading or explicit join-table queries.
  - `edge('members').has(userId)` will become an existence query on `projectMembers`.
- **Ent edge patch syntax**:
  - Example updates tags via `todo.patch({ tags: { add/remove } })`.
  - ORM requires explicit join-table writes (`todoTags` insert/delete) instead.
- **Triggers + aggregates coupling**:
  - The app uses `convex-helpers/server/triggers` + `@convex-dev/aggregate`.
  - Triggers currently wrap `ctx.db` in cRPC mutation wiring; ORM writes must flow through the wrapped `db` to keep aggregates updating.
  - Migration must preserve this ordering: wrap DB first, then build `ctx.orm` from that ctx.

## Candidate Docs Gaps (Actionable Improvements)
These aren’t necessarily ORM bugs, but are missing “migration mapping” guidance.

1. Ents `edge(...).has(id)`:
   - Migration docs mention `with:` and join tables, but not a direct mapping for `.has()`.
   - Add a short snippet: “membership existence check” -> `findFirst` on join table.

2. Ents edge patch semantics (`{ relation: { add/remove } }`):
   - Migration docs mention join-table insert/delete, but many Ents users will specifically be using `patch({ tags: { add/remove } })`.
   - Add a section showing the rewrite to join table mutations (and the required indexes).

3. `convex-helpers/server/stream` migration:
   - `migrate-from-convex.mdx` doesn’t cover streams and async filters.
   - Add guidance: “Replace stream.filterWith(async ...) with precomputed IDs + predicate where + explicit index plan + `maximumRowsRead`”.

4. Trigger-wrapped DB + ORM:
   - No docs note that if you wrap/override `ctx.db` (e.g., Triggers), you must build `ctx.orm` *after* wrapping so ORM writes still trigger side effects.

## Possible ORM Parity Gaps (To Confirm During Implementation)
- A convenience helper for `getMany(ids)` could reduce migration friction (currently: `where: { _id: { in: ids } }, limit: ids.length`).
- A convenience `exists` helper for “join-table membership checks” might help readability.

## Hiccups & Resolutions
| Area | Symptom | Root Cause | Resolution |
|------|---------|------------|------------|
| Typecheck (`example/`) | `bun --cwd example typecheck` failed with implicit `any`, `todo` possibly `null`, `allowFullScan` overload errors, and invalid operator `neq` | Helper ctx typed as `{ orm: any }` caused inference loss; closure narrowing doesn’t apply to captured vars; wrong operator name; mixing Convex `Doc<>` (optional `undefined`) with ORM query results (nullable `null`) | Typed helper ctx using `OrmDbReader/OrmDbWriter`; passed narrowed values as function params; replaced `neq` with `ne`; removed `Doc<>` annotations from ORM result mappings; used typed IDs (e.g. `input.id`) in join-table lookups. |
| Lint (`example/`) | `bun --cwd example lint` failed with Biome `lint/suspicious/noExplicitAny` | Migration left explicit `any` in casts and helper types | Replaced explicit `any` with concrete types or `unknown` casts; shaped returned objects instead of `as any`. |
| Codegen (CLI packaging) | `bun --cwd example codegen` failed with `ERR_REQUIRE_ESM` (`require('execa')` from `cli.cjs`) | CLI was built as CJS while `execa@^9` is ESM-only | Switched CLI build to ESM (`dist/cli.mjs`), updated bin and watcher path, then refreshed workspace bin link via `bun install`. |
| Codegen (`generateMeta`) | `better-convex codegen` crashed: `node:fs does not provide an export named globSync` | `globSync` was imported from `node:fs` (not available in Node 20.12) | Replaced glob usage with a small recursive directory walker and filtered via `isValidConvexFile`. |

## Resources / Key Files
- ORM migration docs:
  - `www/content/docs/db/orm/migrate-from-ents.mdx`
  - `www/content/docs/db/orm/migrate-from-convex.mdx`
- Example app:
  - Schema: `example/convex/functions/schema.ts`
  - cRPC context: `example/convex/lib/crpc.ts`
  - Ents helpers: `example/convex/lib/ents.ts`
  - Stream usage: `example/convex/functions/projects.ts`
  - Tag edge patch usage: `example/convex/functions/todos.ts`
  - Comment edges: `example/convex/functions/todoComments.ts`
