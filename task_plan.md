# Task Plan: Full Coverage Rollout (Bun-First + Co-Located + TDD)

## Goal
Ship a full testing-coverage program for `packages/better-convex/src/**` with co-located tests, Bun as the default runner, and Vitest reserved for `convex-test` integration coverage only.

## Current Phase
Phase 11 (In Progress)

## Phases
### Phase 1: Baseline, Constraints, and Coverage Contract
- [x] Confirm user constraints: Bun-first, co-located tests, Vitest only for `convex-test`.
- [x] Capture current test topology (`convex/`, `/test`, co-located in `packages`).
- [x] Capture baseline runtime coverage for `packages/better-convex/src/**/*.ts`.
- [x] Record missing-surface map by concern in `findings.md`.
- **Status:** complete

### Phase 2: Runner Split and Test Location Migration Plan
- [x] Update scripts so default order is `bun test` (packages) then `vitest run` (convex-only).
- [x] Restrict Vitest include to `convex/**/*.test.ts(x)` and remove `/test/**` from Vitest scope.
- [x] Define migration path from `/test/orm/*.test.ts` to co-located `packages/better-convex/src/orm/*.test.ts`.
- [x] Document module test-placement rules in repo docs.
- **Status:** complete

### Phase 3: ORM Co-Located Bun Suite (Non-Convex-Test Paths)
- [x] Move/port `/test/orm/*` tests beside source files under `packages/better-convex/src/orm/**`.
- [x] Convert runner-specific APIs where needed (Vitest -> Bun patterns).
- [x] Keep `convex/orm/*.test.ts` as Vitest integration coverage using `convex-test`.
- [x] TDD cycle per file cluster: RED fail, GREEN minimal fix, REFACTOR.
- **Status:** complete

### Phase 4: CRPC Coverage Track
- [x] Add co-located Bun tests for `crpc/error.ts`.
- [x] Add co-located Bun tests for `crpc/query-options.ts`.
- [x] Add co-located Bun tests for `crpc/http-types.ts`.
- [x] Add export/contract tests for `crpc/index.ts` and relevant type-only guards.
- [x] Apply strict TDD for behavior and edge-case branches.
- **Status:** complete

### Phase 5: Auth Coverage Track (auth + auth-client + auth-nextjs)
- [x] Add co-located Bun tests for `auth/adapter-utils.ts` and `auth/helpers.ts`.
- [x] Add co-located Bun tests for `auth/adapter.ts`, `auth/create-api.ts`, `auth/create-client.ts`.
- [x] Add co-located Bun tests for `auth/create-schema.ts`, `auth/middleware.ts`, `auth/registerRoutes.ts`.
- [x] Add Bun tests for `auth-client` and `auth-nextjs` entry behavior.
- [x] Apply strict TDD for high-complexity branches and error paths.
- **Status:** complete

### Phase 6: React Coverage Track
- [x] Add co-located Bun tests for `react/client.ts`, `react/proxy.ts`, `react/http-proxy.ts`.
- [x] Add co-located Bun tests for `react/use-query-options.ts`.
- [x] Add co-located Bun tests for `react/use-infinite-query.ts`.
- [x] Add co-located Bun tests for `react/auth-mutations.ts`, `react/singleton.ts`, `react/vanilla-client.ts`.
- [x] Add focused smoke tests for `react/index.ts` and context wiring.
- [x] Use TDD for non-UI logic and deterministic hook behavior.
- **Status:** complete

### Phase 7: Server and RSC Coverage Track
- [x] Add co-located Bun tests for `server/caller*.ts`, `server/error.ts`, `server/lazy-caller.ts`.
- [x] Add co-located Bun tests for `server/http-router.ts`.
- [x] Add co-located Bun tests for `server/builder.ts` (middleware, meta, internal/procedure flags, input merging).
- [x] Add co-located Bun tests for `rsc/http-server.ts`, `rsc/proxy-server.ts`, `rsc/server-query-client.ts`.
- [x] Deepen `server/http-builder.ts` coverage (query param coercion, method mismatch, JSON/form parsing, schema validation).
- [x] Cover remaining critical error/validation branches and contract boundaries with TDD.
- **Status:** complete

### Phase 8: CLI Coverage Track
- [x] Add co-located Bun tests for `cli/env.ts`.
- [x] Add co-located Bun tests for `cli/watcher.ts`.
- [x] Add co-located Bun tests for `cli/codegen.ts`.
- [x] Add co-located Bun tests for `cli/cli.ts` command parsing and error handling.
- [x] Use temporary fixtures and deterministic IO in TDD loops.
- **Status:** complete

### Phase 9: Internal + Shared + Type Contract Coverage
- [x] Add/expand co-located Bun tests for `internal/auth.ts`.
- [x] Add/expand co-located Bun tests for `internal/hash.ts`.
- [x] Ensure `internal/query-key.ts` has direct or indirect runtime coverage.
- [x] Keep `shared/meta-utils.test.ts` as reference pattern for co-location.
- [x] Validate compile-time API guarantees via `bun run typecheck` and `test/types`.
- [x] Ensure public entry points keep stable type/runtime contracts.
- **Status:** complete

### Phase 10: Coverage Gates, CI Wiring, and Ship Checklist
- [x] Define coverage floors and enforce in CI (Bun non-ORM mean + critical per-file floors via `tooling/coverage-check.ts`; Vitest ORM integration thresholds via `--coverage.thresholds.*`).
- [ ] Ensure every public export group has non-zero runtime coverage and critical branch tests.
- [x] Final verification command set includes: `bun run check:ci` (lint + typecheck + coverage-gated tests)
- [ ] Publish final gap report with remaining risks and explicit ship/no-ship call.
- **Status:** in_progress

### Phase 11: Hardening for Ship-Readiness (Low-Coverage Public Surfaces)
- [x] Auth adapter hardening: raise coverage for `auth/adapter.ts` beyond smoke-level.
- [ ] React client hardening: raise coverage for `react/client.ts` (client mode, error paths, auth integration).
- [x] Fill remaining auth/react gaps: `auth/registerRoutes.ts`, `react/auth-store.tsx`, `react/auth-mutations.ts`.
- [x] Decide and enforce minimum coverage floors for `server/builder.ts` and `cli/env.ts` (in `tooling/coverage-check.ts`).
- **Status:** in_progress

## Key Questions
1. What coverage floor is required to call this "ship-ready" per concern (`crpc`, `auth`, `react`, etc.)?
2. Which files are runtime-critical vs type-only so we do not chase meaningless 100%?
3. Which existing `/test/orm` specs should be migrated unchanged versus rewritten for Bun semantics?
4. Where do we need integration tests in Vitest (`convex-test`) versus pure unit tests in Bun?
5. Which public APIs require explicit regression tests for contributor safety guarantees?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Bun is the default runner for non-Convex-test tests | Matches user requirement and keeps fast package-local feedback |
| Vitest is reserved for `convex-test` integration suites under `convex/**` | Keeps edge-runtime + Convex simulation isolated |
| Test files should be co-located beside source files in `packages/better-convex/src/**` | Improves ownership and discoverability per module |
| Coverage rollout is concern-separated (`orm`, `crpc`, `auth`, `react`, `server`, `rsc`, `cli`) | Reduces cross-domain coupling and enables phased delivery |
| TDD rule is strict for behavior-heavy logic: RED -> GREEN -> REFACTOR | Prevents false confidence from post-hoc tests |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| No new errors in planning phase | 1 | N/A |
| Biome `useTopLevelRegex` triggered on migrated test files | 1 | Added test-file-level ignore and style fixes; lint returned to green |
| `unique symbol` type mismatch in `crpc/types.test.ts` (`toBe(Symbol.for(...))`) | 1 | Switched assertion to `Symbol.keyFor(FUNC_REF_SYMBOL)` |
| Biome lint/format errors in new co-located auth/react tests | 1 | Applied Biome fixes (organize imports, `@ts-expect-error`, template literals, formatter output) and re-ran `bun run lint` |
| ESLint warnings from generated `coverage/**` artifacts | 1 | Added `**/coverage/**` to `eslint.config.mjs` ignores |

## Notes
- Existing unrelated working-tree changes remain untouched.
- Execution order can be parallelized by concern once runner split is stable.
- `test/types` remains a required gate even when runtime tests are green.
