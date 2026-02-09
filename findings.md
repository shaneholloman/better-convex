# Findings & Decisions

## Requirements
- Build a full coverage plan using file-based planning.
- Use TDD as the execution model for implementation phases.
- Use Bun for anything not requiring `convex-test`.
- Keep Vitest only for `convex-test` suites (Convex integration tests).
- Co-locate tests next to source files under `packages/better-convex/src/**`.
- Organize rollout by concern (`crpc`, `auth`, `react`, etc.).

## Research Findings
- Updated runner topology:
  - Root script `/Users/zbeyens/GitHub/better-convex/package.json:23` runs `bun run test:bun && bun run test:vitest`.
  - Bun config `/Users/zbeyens/GitHub/better-convex/bunfig.toml:5` keeps Bun tests rooted at `./packages`.
  - Vitest config `/Users/zbeyens/GitHub/better-convex/vitest.config.mts:16` now includes only:
    - `convex/**/*.test.ts(x)`
    - `packages/**/*.vitest.ts(x)` (for co-located `convex-test` usage)
- Updated test inventory after migration:
  - `convex/**/*.test.ts(x)`: `16` files (Convex integration).
  - `packages/better-convex/src/**/*.test.ts(x)`: `55` Bun co-located unit-test files.
  - `packages/better-convex/src/**/*.vitest.ts(x)`: `3` co-located Vitest integration files.
  - `/Users/zbeyens/GitHub/better-convex/test/orm` removed (all 12 files migrated).
- Updated source-vs-test co-location in `packages/better-convex/src`:
  - `orm`: `44` prod files, `12` co-located tests (`9` Bun + `3` Vitest).
  - `crpc`: `5` prod files, `5` co-located tests.
  - `auth`: `10` prod files, `9` co-located tests.
  - `auth-client`: `2` prod files, `2` co-located tests.
  - `auth-nextjs`: `1` prod file, `1` co-located test.
  - `react`: `11` prod files, `12` co-located tests.
  - `server`: `11` prod files, `7` co-located tests.
  - `rsc`: `4` prod files, `3` co-located tests.
  - `cli`: `4` prod files, `4` co-located tests.
  - `internal`: `4` prod files, `2` co-located tests.
  - `shared`: `1` prod file, `1` co-located test.
- Runtime coverage baseline (`bunx vitest run --coverage --coverage.include='packages/better-convex/src/**/*.ts'`):
  - Statements: `53.39%`
  - Branches: `46.32%`
  - Functions: `52.70%`
  - Lines: `54.22%`
- Critical uncovered surfaces in that baseline:
  - `auth`, `auth-client`, `auth-nextjs`, `react`, `rsc`, `server`, `cli` report `0%` runtime coverage.
  - Next concern tracks are still missing runtime coverage outside `orm`, `shared`, and `crpc`.
- Auth + React coverage snapshot after Phase 5/6 additions (`bun test --coverage packages/better-convex/src/auth packages/better-convex/src/auth-client packages/better-convex/src/auth-nextjs packages/better-convex/src/react`):
  - Functions: `56.97%`
  - Lines: `57.71%`
  - Strongly covered:
    - `auth/helpers.ts`, `auth/create-schema.ts`, `auth/middleware.ts`: `100%` lines.
    - `auth/create-client.ts`: `87.80%` lines.
    - `auth-nextjs/index.ts`: `81.40%` lines.
    - `react/singleton.ts`: `100%` lines.
    - `react/vanilla-client.ts`: `100%` lines.
    - `react/http-proxy.ts`: `82.66%` lines.
    - `react/context.tsx`: `71.74%` lines.
    - `react/use-query-options.ts`: `98.65%` lines.
  - Still critical in this concern set:
    - `auth/create-api.ts`: `43.47%` lines.
    - `auth/adapter.ts`: `11.79%` lines.
    - `auth/adapter-utils.ts`: `57.55%` lines.
    - `auth/registerRoutes.ts`: `34.41%` lines.
    - `react/client.ts`: `10.19%` lines.
    - `react/auth-store.tsx`: `27.15%` lines.
    - `react/auth-mutations.ts`: `15.09%` lines.
- Latest Bun runtime coverage snapshot (`bun test --coverage`, 2026-02-08):
  - Functions: `65.66%`
  - Lines: `70.49%`
  - All CRPC runtime files remain at `100%` lines/functions.
- Update: 2026-02-08 (Auth Adapter OR De-Dupe Fix)
  - Found and fixed a correctness bug in `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/adapter.ts`: OR-union paths used reference-equality dedupe and could return duplicate rows when the same record matched multiple OR clauses.
  - Fix: de-dupe OR unions by `_id`/`id` via `uniqueBy` (applies to both `httpAdapter` and `dbAdapter`).
  - Updated Bun runtime coverage snapshot (`bun test --coverage`):
    - Functions: `65.77%`
    - Lines: `70.60%`
    - `auth/adapter.ts`: Functions `72.97%`, Lines `23.68%`
- Update: 2026-02-08 (React Client queryFn Hardening)
  - Added client-mode `queryFn()` coverage in `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.test.ts`:
    - `convexClient.query` / `convexClient.action`
    - auth-required `UNAUTHORIZED` guard (calls `onQueryUnauthorized`)
    - non-Convex fallback path
  - Updated Bun runtime coverage snapshot (`bun test --coverage`):
    - Functions: `65.99%`
    - Lines: `70.77%`
    - `react/client.ts`: Functions `33.33%`, Lines `26.29%`
- ORM coverage measurement (Bun unit vs `convex-test` integration):
  - Bun runtime coverage (unit-only, `bun run test:bun --coverage`) heavily under-represents end-to-end ORM paths, because the Convex execution layer is primarily exercised via `convex-test` integration suites.
    - Example: `packages/better-convex/src/orm/query.ts` shows `1.33%` lines in Bun coverage, but is exercised extensively in Convex integration tests.
  - Vitest + `convex-test` integration coverage for ORM (`bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`):
    - All ORM files (combined): `76.17%` lines / `80.43%` functions.
    - `packages/better-convex/src/orm/**`: `76.07%` lines / `80.92%` functions.
    - Notable 0% files in this run: `orm/index.ts`, `orm/introspection.ts`, `orm/types.ts` (barrels or Bun-covered-only surfaces).
- CRPC phase results:
  - Added co-located Bun tests for `crpc/error.ts`, `crpc/query-options.ts`, `crpc/http-types.ts`, `crpc/types.ts`, and `crpc/index.ts`.
  - `bun test --coverage crpc` reports `100%` functions and `100%` lines for:
    - `packages/better-convex/src/crpc/error.ts`
    - `packages/better-convex/src/crpc/http-types.ts`
    - `packages/better-convex/src/crpc/index.ts`
    - `packages/better-convex/src/crpc/query-options.ts`
    - `packages/better-convex/src/crpc/types.ts`
- Auth + React phase results:
  - Added co-located Bun tests:
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/adapter-utils.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/adapter.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/create-api.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/create-client.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/create-schema.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/helpers.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/index.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/middleware.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/registerRoutes.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-client/index.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-nextjs/index.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-mutations.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-store.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.subscriptions.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/http-proxy.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/index.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/proxy.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/singleton.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/vanilla-client.test.ts`
- Verification after migration:
  - `bun run test:bun` passes (`253` tests across `55` files).
  - `bun run test:vitest` passes (`254` passed, `1` skipped across `19` files).
  - `bun run test` passes end-to-end with split runners.
  - `bun run typecheck` passes.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Bun-first runtime testing for package code | Matches requested workflow and fast local cycle |
| Vitest scope limited to Convex integration (`convex-test`) | Keeps edge-runtime simulation isolated to where it is needed |
| Co-located tests in `packages/better-convex/src/**` | Improves module ownership and contributor discoverability |
| Concern-separated execution tracks | Enables phased progress without cross-domain coupling |
| TDD for behavior-heavy modules with RED/GREEN/REFACTOR | Prevents false-positive coverage growth |
| Keep `bun run typecheck` as mandatory companion gate | Runtime coverage alone cannot protect type API contracts |
| Coverage gates split: Bun (non-ORM) + Vitest (ORM) | Bun-only coverage under-represents ORM execution paths which are validated via `convex-test` integration |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Existing repo has pre-existing modified files from prior work | Kept focus on planning files only; no unrelated changes reverted |
| Session catchup helper not available in environment | Performed manual baseline capture directly from repo files/commands |
| Biome lint rule `useTopLevelRegex` fired after tests moved under linted package path | Added test-file-level Biome ignore for regex matchers and applied style fixes |
| Typecheck failed on `unique symbol` equality assertion in `crpc/types.test.ts` | Replaced direct symbol equality with `Symbol.keyFor(FUNC_REF_SYMBOL)` assertion |
| New auth/react tests initially failed Biome lint/format rules | Applied Biome-driven fixes (import order, `@ts-expect-error`, template literals, formatter output) and re-ran `bun run lint` |
| ESLint warned on generated coverage artifacts (`coverage/**`, `coverage-*/**`) | Added ignore patterns for both `coverage/**` and `coverage-*/**` |
| Vitest/esbuild got into a bad state ("service was stopped") | Clean reinstall (`rm -rf node_modules && bun install`) resolved the issue |
| Vitest externalized monorepo `better-convex`, so `better-convex/orm` resolved to stale `dist/**` output | Inlined `better-convex` in `/Users/zbeyens/GitHub/better-convex/vitest.config.mts` so `resolve.alias` uses `src/**` |
| Bun `child_process.execSync` did not reliably honor runtime `process.env.PATH` overrides in tests (CLI env) | Switched the `cli/env` tests to `spyOn(child_process, 'execSync')` so no real `npx convex ...` subprocesses run |

## Resources
- Root scripts: `/Users/zbeyens/GitHub/better-convex/package.json`
- Bun test config: `/Users/zbeyens/GitHub/better-convex/bunfig.toml`
- Vitest config: `/Users/zbeyens/GitHub/better-convex/vitest.config.mts`
- Convex integration tests: `/Users/zbeyens/GitHub/better-convex/convex/orm`
- Package source root for co-located tests: `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src`
- Existing co-location example: `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/shared/meta-utils.test.ts`
- CRPC co-located test set: `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/*.test.ts`

## Visual/Browser Findings
- No visual artifacts required for this planning task.

## Update: 2026-02-08 (Current Coverage Snapshot + Remaining Gaps)

### Latest Coverage
- Bun runtime coverage (`bun test --coverage`, "All files" mean; includes ORM):
  - Functions: `66.47%`
  - Lines: `71.70%`
- Bun non-ORM mean (coverage gate, computed from Bun lcov; excludes `packages/better-convex/src/orm/**`):
  - Functions: `87.66%`
  - Lines: `86.89%`
- ORM integration coverage (`bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`):
  - ORM Lines: `76.17%`
  - ORM Functions: `80.43%`
  - ORM Branches: `65.54%`
  - ORM Statements: `74.80%`

### Coverage Gates Added (Contributor Safety)
- Added `tooling/coverage-check.ts` and scripts:
  - `bun run test:coverage` (Bun non-ORM coverage + Vitest ORM thresholds)
  - `bun run check:ci` (lint + typecheck + coverage-gated tests)
- CI now runs `bun check:ci`.
- Bun gate (non-ORM):
  - Mean floors: lines `>= 85`, funcs `>= 85`
  - Critical per-file floors:
    - `react/client.ts`: lines `>= 25`, funcs `>= 30`
    - `server/builder.ts`: lines `>= 50`, funcs `>= 45`
    - `auth/create-api.ts`: lines `>= 40`, funcs `>= 75`
    - `cli/env.ts`: lines `>= 50`, funcs `>= 100`
- Vitest ORM gate:
  - lines `>= 75`, funcs `>= 80`, branches `>= 60`, statements `>= 70`

### Notable Improvements Since Last Snapshot
- `auth/registerRoutes.ts`: `98.88%` lines (CORS + preflight now exercised)
- `react/auth-store.tsx`: `81.82%` lines (hooks + component gates now exercised)
- `react/auth-mutations.ts`: `85.56%` lines (mutationFns + polling behavior now exercised)
- `auth/adapter.ts`: `57.33%` lines (raised above smoke-level and OR union bug fixed earlier)

### Main Remaining Gaps (Ship-Critical Surface Area)
- `react/client.ts`: `27.98%` lines
  - This file is large and still under-covered relative to its centrality.
  - Tests currently cover subscription lifecycle + key hashing + queryFn routing, but not many secondary code paths.
- `server/builder.ts`: `50.88%` lines
  - Core composition/registration paths still have sizable uncovered regions.
- `auth/create-api.ts`: `43.58%` lines
  - Many internal handler paths remain unexercised.

### Expected “0% in Bun” (But Covered by Vitest Convex Integration)
- Large ORM runtime files (`query.ts`, `insert.ts`, `update.ts`, `delete.ts`, `stream.ts`, etc.) show low/0% in Bun coverage because they depend on Convex execution semantics.
- These are intentionally exercised in Vitest via `convex-test` and should be gated separately from Bun unit coverage.

### Stability Finding (Test Harness)
- `/Users/zbeyens/GitHub/better-convex/tooling/test-setup.ts` previously imported `@testing-library/react` before registering `@happy-dom/global-registrator`.
  - This can bind Testing Library’s `screen` against a missing `document.body` depending on module init order.
  - Fixed by importing `cleanup()` dynamically inside `afterEach()` after DOM globals are registered.
