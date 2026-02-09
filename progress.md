# Progress Log

## Session: 2026-02-08

### Phase 1: Baseline, Constraints, and Coverage Contract
- **Status:** complete
- **Started:** 2026-02-08 12:28
- Actions taken:
  - Loaded and applied `planning-with-files` and `tdd` skill workflows.
  - Confirmed user constraints:
    - Bun for non-`convex-test` coverage.
    - Vitest only for `convex-test` suites.
    - Co-locate tests in `packages/better-convex/src/**`.
  - Audited current runner config:
    - `bunfig.toml` roots Bun tests at `./packages`.
    - `vitest.config.mts` still includes `/test/**`.
  - Audited current test topology:
    - `convex` tests: `16`
    - `/test` tests: `12`
    - co-located package tests: `1`
  - Captured source coverage baseline for `packages/better-convex/src/**/*.ts`.
  - Rewrote planning artifacts into concern-separated multi-phase rollout.
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/findings.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/progress.md` (updated)

### Phase 2: Runner Split and Test Location Migration Plan
- **Status:** complete
- Actions taken:
  - Updated root scripts:
    - `test` -> `bun run test:bun && bun run test:vitest`
    - added `test:bun` and `test:vitest`
    - `check` now runs `bun run test`.
  - Updated Vitest include set to only:
    - `convex/**/*.test.ts(x)`
    - `packages/**/*.vitest.ts(x)`
  - Documented test placement and runner split rules in `README.md`.
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/package.json` (updated)
  - `/Users/zbeyens/GitHub/better-convex/vitest.config.mts` (updated)
  - `/Users/zbeyens/GitHub/better-convex/README.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)

### Phase 3: ORM Co-Located Bun Suite (Non-Convex-Test Paths)
- **Status:** complete
- Actions taken:
  - Migrated all former `/test/orm/*.test.ts` files to co-located files under `packages/better-convex/src/orm/**`.
  - Converted non-`convex-test` specs to Bun-global style (`describe`, `test`, `expect`, `spyOn`).
  - Renamed `convex-test`-dependent specs to co-located `*.vitest.ts`:
    - `pagination.vitest.ts`
    - `stream.vitest.ts`
    - `scheduled-workers.vitest.ts`
  - Resolved lint migration fallout (`useTopLevelRegex`) using file-level Biome test exceptions and small style fixes.
  - Removed now-empty `/Users/zbeyens/GitHub/better-convex/test/orm` directory.
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/orm/*.test.ts` (created via migration)
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/orm/*.vitest.ts` (created via migration)
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/orm/rls/roles.test.ts` (created via migration)
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/findings.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/progress.md` (updated)

### Phase 4: CRPC Coverage Track
- **Status:** complete
- Actions taken:
  - Added co-located Bun tests:
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/error.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/query-options.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/http-types.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/types.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/index.test.ts`
  - Verified CRPC-focused coverage via `bun test --coverage crpc`.
  - Fixed one typecheck issue in `types.test.ts` (`unique symbol` assertion shape).
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/crpc/*.test.ts` (created)
  - `/Users/zbeyens/GitHub/better-convex/findings.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/progress.md` (updated)

### Phase 5: Auth Coverage Track (auth + auth-client + auth-nextjs)
- **Status:** in_progress
- Actions taken:
  - Added co-located auth tests for:
    - `adapter-utils.ts`
    - `adapter.ts`
    - `create-api.ts`
    - `create-client.ts`
    - `create-schema.ts`
    - `helpers.ts`
    - `index.ts`
    - `middleware.ts`
  - Added co-located auth entrypoint tests for:
    - `auth-client/index.ts`
    - `auth-nextjs/index.ts`
  - Verified focused auth suite and addressed test typing issues to keep `bun run typecheck` green.
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/*.test.ts` (created)
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-client/index.test.ts` (created)
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-nextjs/index.test.ts` (created)
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/findings.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/progress.md` (updated)

### Phase 6: React Coverage Track
- **Status:** in_progress
- Actions taken:
  - Added co-located react tests for:
    - `auth-mutations.ts`
    - `auth-store.tsx` (decode helper)
    - `index.ts`
    - `proxy.ts`
    - `singleton.ts`
    - `vanilla-client.ts`
  - Verified react-focused suite and fixed strict typing mismatches.
- Files created/modified:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/*.test.ts` (created)
  - `/Users/zbeyens/GitHub/better-convex/task_plan.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/findings.md` (updated)
  - `/Users/zbeyens/GitHub/better-convex/progress.md` (updated)

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Root test suite | `bun run test` | Confirm current green baseline before new plan | Pass (`28` Vitest files, `318` passed/`1` skipped; Bun `8` passed) | pass |
| Bun package coverage snapshot | `bun test --coverage` | Measure current Bun-only co-located coverage baseline | Covers `shared/meta-utils` (`55.10%` lines) | pass |
| Src-wide coverage snapshot | `bunx vitest run --coverage --coverage.include='packages/better-convex/src/**/*.ts'` | Quantify missing concern coverage | `54.22%` lines overall; major concerns at `0%` | pass |
| Bun unit test split | `bun run test:bun` | New co-located Bun suite passes after migration | Pass (`90` passed across `15` files) | pass |
| Vitest integration split | `bun run test:vitest` | Convex integration suite + `*.vitest.ts` passes | Pass (`254` passed, `1` skipped across `19` files) | pass |
| End-to-end split command | `bun run test` | Bun then Vitest both run cleanly | Pass | pass |
| Workspace typecheck | `bun run typecheck` | No type regressions from path/import changes | Pass | pass |
| Lint | `bun run lint` | No lint errors after migration | Pass (0 errors, 3 coverage warnings) | pass |
| CRPC focused coverage | `bun test --coverage crpc` | Ensure new CRPC tests exercise runtime modules | Pass (100% funcs/lines for `crpc/*`) | pass |
| Auth+React focused coverage | `bun test --coverage packages/better-convex/src/auth packages/better-convex/src/auth-client packages/better-convex/src/auth-nextjs packages/better-convex/src/react` | Quantify concern track progress | Pass (`50.24%` funcs, `49.78%` lines in concern slice) | pass |
| Full Bun runtime coverage | `bun run test:bun --coverage` | Refresh ship-readiness runtime baseline | Pass (`49.19%` funcs, `55.22%` lines overall) | pass |
| New auth/react suite | `bun test packages/better-convex/src/auth/... packages/better-convex/src/react/...` | Validate newly added co-located tests | Pass (`54` tests across `16` files) | pass |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-02-08 12:30 | Session catchup helper unavailable in environment | 1 | Continued with direct repo inspection and manual baseline capture |
| 2026-02-08 12:46 | Biome `useTopLevelRegex` errors after moving tests under `packages` | 1 | Added file-level test-only Biome ignore + style fixes, then reran lint/tests |
| 2026-02-08 12:51 | Typecheck failed in `crpc/types.test.ts` due `unique symbol` equality mismatch | 1 | Switched assertion to `Symbol.keyFor(FUNC_REF_SYMBOL)` |
| 2026-02-08 13:03 | New auth/react tests failed Biome formatting checks | 1 | Ran `bun run lint:fix` and re-ran lint |
| 2026-02-08 13:03 | New auth/react tests failed typecheck due strict signatures | 1 | Added explicit typed test payload fields/casts and aligned middleware `next` behavior |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase 6 in progress (react coverage track) |
| Where am I going? | Remaining concern tracks (`react` deep hooks/client, `server`, `rsc`, `cli`, `internal`) |
| What's the goal? | Full Bun-first, co-located coverage program with Vitest only for Convex integration |
| What have I learned? | Runner split + co-location works; auth/react deterministic units are straightforward while hook-heavy/reactive paths remain the major gap |
| What have I done? | Completed Phase 2, 3, 4 and advanced Phase 5/6 with passing lint/test/typecheck |

## Update: 2026-02-08 (Later)

### Phase 5/6: Auth + React Coverage Extension
- Actions taken:
  - Added co-located Bun tests:
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/registerRoutes.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/http-proxy.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.test.ts`
    - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.subscriptions.test.ts`
  - Fixed Biome lint issues in the new tests (formatting, import order, `@ts-expect-error`, template literals).
  - Ignored generated `coverage/**` artifacts in ESLint to keep `bun run lint` clean.
- Commands re-verified:
  - `bun run lint`: pass
  - `bun run typecheck`: pass
  - `bun run test`: pass
  - `bun run test:bun --coverage`: Functions `51.67%`, Lines `58.02%`
  - `bun test --coverage packages/better-convex/src/auth packages/better-convex/src/auth-client packages/better-convex/src/auth-nextjs packages/better-convex/src/react`: Functions `56.97%`, Lines `57.71%`
  - `bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`: ORM Lines `76.07%`

### Unexpected Findings
- `createHttpProxy` unknown procedures throw on property access of `.query`/`.mutate`, not on invocation.

## Update: 2026-02-08 (Latest)

### Runner Stability
- Observed a Vitest hang/`esbuild` "service was stopped" state that was resolved by a clean reinstall (`rm -rf node_modules && bun install`).

### Commands Re-Verified
- `bun run test`: pass
- `bun run test:bun --coverage`: Functions `54.02%`, Lines `59.40%`
- `bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`: ORM Lines `76.07%`, Functions `80.92%`

## Update: 2026-02-08 (Latest Continued)

### Phase 6 Completion: React Infinite Query + Auth Client Provider
- Added co-located Bun tests:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/use-infinite-query.test.tsx`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-client/convex-auth-provider.test.tsx`
- Typecheck fixes:
  - Removed an unused `@ts-expect-error` in `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.test.ts`.
  - Avoided TS control-flow narrowing issue in `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth-client/convex-auth-provider.test.tsx`.

### Commands Re-Verified
- `bun run test`: pass
- `bun run typecheck`: pass

### Update: 2026-02-08 (Vitest Source Alias Fix)
- Root cause: Vitest was externalizing the monorepo `better-convex` package, so `better-convex/orm` resolved via package exports to `packages/better-convex/dist/**` instead of the aliased `packages/better-convex/src/**`. This broke newer runtime methods (e.g. `exists()` / `findFirstOrThrow()`) that are present in source but not in the stale `dist` bundle.
- Fix: inline `better-convex` in `/Users/zbeyens/GitHub/better-convex/vitest.config.mts` so Vite applies `resolve.alias` consistently.
- Result: `bun run test:vitest` + `bun run test` back to green.

## Update: 2026-02-08 (Phase 7: Server + RSC Coverage)

### Added Coverage (Bun)
- Added co-located Bun tests:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/server/builder.test.ts`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/server/http-router.test.ts`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/rsc/http-server.test.ts`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/rsc/proxy-server.test.ts`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/rsc/server-query-client.test.ts`

### Typecheck/Test Fixes
- Fixed Bun `fetch` spy typing (Bun’s `fetch` includes static helpers like `fetch.preconnect`).
- Adjusted a proxy-server test to match `PaginatedFnMeta` typing when using `makeFunctionReference()` (args are `any`, treated as paginated).
- Removed an impossible `RoutableMethod === 'ALL'` comparison in `server/http-router.test.ts`.

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run test`: pass
- `bun run test:bun --coverage`: Functions `60.30%`, Lines `65.58%`
- ORM integration coverage: `bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`
  - ORM: Lines `76.07%`, Functions `80.92%` (All included files: Lines `76.17%`, Functions `80.43%`)
- `bun run test:bun --coverage`: Functions `56.18%`, Lines `61.17%`

## Update: 2026-02-08 (Phase 8: CLI env + Lint Fixes)

### Added Coverage (Bun)
- Added co-located Bun tests:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/cli/env.test.ts`

### Testability Notes
- Bun’s `child_process.execSync()` stubbing via `PATH` proved unreliable; the CLI env tests use `spyOn(child_process, 'execSync')` to keep the suite hermetic.

### Lint Fixes
- Fixed Biome lint errors in several test files:
  - Hoisted inline regex literals into top-level `const` values (`useTopLevelRegex`).
  - Replaced a `throw { ... }` in a test with `throw Object.assign(new Error(...), { ... })` (`useThrowOnlyError`).
  - Replaced string concatenation with a template literal (`useTemplate`).

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run lint`: pass
- `bun run test`: pass

## Update: 2026-02-08 (Phase 7: HTTP Builder Deep Coverage)

### Added Coverage (Bun)
- Expanded `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/server/http-builder.test.ts` to cover:
  - query-param coercion (array/number/boolean) via `searchParams()`
  - path-param decoding + schema parsing via `params()`
  - JSON + `application/x-www-form-urlencoded` body parsing via `input()`
  - multipart parsing via `form()`
  - Response pass-through (handler returns `Response`)
  - output schema failure stays `500` (server bug), not `400`

### Behavior Fix
- `http-builder` now maps Zod validation failures for:
  - `paramsSchema`, `querySchema`, `inputSchema`, `formSchema`
  - into `CRPCError { code: 'BAD_REQUEST' }` with clear messages.

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run test`: pass
- `bun run test:bun --coverage`: Functions `62.45%`, Lines `67.01%`

## Update: 2026-02-08 (Phase 8: CLI Codegen Coverage)

### Added Coverage (Bun)
- Added co-located Bun tests:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/cli/codegen.test.ts`

### Covered Behaviors
- `getConvexConfig()` defaults and `convex.json` overrides.
- `generateMeta()`:
  - extracts `_crpcMeta` from runtime exports
  - skips private files/exports and `internal` functions
  - extracts HTTP routes from both `_crpcHttpRoute` and router `_def.procedures`
  - dedupes `_http` routes by preferring longer/nested keys (e.g. `todos.get` over `get`)

### Commands Re-Verified
- `bun run lint`: pass
- `bun run test`: pass

## Update: 2026-02-08 (Auth Create API Handler Coverage)

### Added Coverage (Bun)
- Expanded `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/create-api.test.ts` to cover:
  - `updateOneHandler` (not found + before/after hooks)
  - `updateManyHandler` (unique-field guard + multi-doc patch)
  - `deleteOneHandler` (hook transformation + early return)
  - `deleteManyHandler` (multi-doc delete + count/ids)

### Cleanup
- Removed `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/create-api.handlers.test.ts` (test assumed dependency injection that doesn’t exist and broke `bun run test:bun`).

## Update: 2026-02-08 (Latest Coverage Baseline)

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run lint`: pass
- `bun run test`: pass
- `bun test --coverage`: Functions `65.66%`, Lines `70.49%`
- `bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`: ORM Lines `76.17%`, Functions `80.43%`

## Update: 2026-02-08 (Auth Adapter OR De-Dupe Fix)

### Bug Fix
- Fixed OR-union deduping in `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/adapter.ts` to de-dupe by `_id`/`id` (previously used reference equality and could return duplicates).

### Added Coverage (Bun)
- Expanded `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/adapter.test.ts` with a regression test asserting OR unions de-dupe correctly for both `findMany` and `count`.

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run lint`: pass
- `bun run test`: pass
- `bun test --coverage`: Functions `65.77%`, Lines `70.60%`

## Update: 2026-02-08 (React Client queryFn Hardening)

### Added Coverage (Bun)
- Expanded `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/client.test.ts` to cover client-mode `queryFn()` paths:
  - Convex query execution via `convexClient.query`
  - Convex action execution via `convexClient.action`
  - required-auth guard (`UNAUTHORIZED` + `onQueryUnauthorized`)
  - fallback to `otherFetch` for non-Convex keys

### Commands Re-Verified
- `bun run lint`: pass
- `bun run test`: pass
- `bun test --coverage`: Functions `65.99%`, Lines `70.77%`

## Update: 2026-02-08 (Auth Store/Mutations + RegisterRoutes CORS + Test Setup Stability)

### Fixes / Stabilization
- Fixed a Bun test setup ordering issue in `/Users/zbeyens/GitHub/better-convex/tooling/test-setup.ts`:
  - Importing `@testing-library/react` before registering `@happy-dom/global-registrator` can bind `screen` against a missing `document.body`.
  - Switched to a dynamic import of `cleanup()` inside `afterEach()` so DOM globals are registered before Testing Library loads.
- Hardened `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/auth/registerRoutes.test.ts` CORS preflight assertions:
  - `Access-Control-Allow-Origin` header casing can vary; assertion now tolerates common casing variants.

### Added/Expanded Coverage (Bun)
- Expanded co-located Bun tests for:
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-store.tsx` via `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-store.test.tsx`
  - `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-mutations.ts` via `/Users/zbeyens/GitHub/better-convex/packages/better-convex/src/react/auth-mutations.test.tsx`

### Commands Re-Verified
- `bun run typecheck`: pass
- `bun run lint`: pass
- `bun run test`: pass
- `bun test --coverage`: Functions `68.26%`, Lines `73.19%`
- `bunx vitest run --coverage --coverage.include='packages/better-convex/src/orm/**/*.ts' --coverage.reporter=text`: ORM Lines `76.17%`, Functions `80.43%`

## Update: 2026-02-08 (Coverage Gates + CI Wiring)

### Added Coverage Gates
- Added `/Users/zbeyens/GitHub/better-convex/tooling/coverage-check.ts`:
  - Runs Bun coverage and enforces non-ORM floors (excludes `packages/better-convex/src/orm/**`).
  - Runs Vitest coverage for ORM (`convex-test`) with thresholds.
- Added scripts:
  - `bun run test:coverage`
  - `bun run check:ci`
- Updated CI to run coverage-gated checks:
  - `/Users/zbeyens/GitHub/better-convex/.github/workflows/ci.yml` now runs `bun check:ci`

### Commands Re-Verified
- `bun run lint`: pass (eslint warnings from generated coverage html only)
- `bun run typecheck`: pass
- `bun run test`: pass
- `bun run test:coverage`: pass
  - Bun non-ORM mean: Lines `86.89%`, Functions `87.66%`
  - Vitest ORM: Lines `76.17%`, Functions `80.43%`, Branches `65.54%`, Statements `74.80%`
- `bun run check:ci`: pass
