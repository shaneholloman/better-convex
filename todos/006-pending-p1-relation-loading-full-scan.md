---
status: pending
priority: p1
issue_id: "006"
tags: [code-review, performance, orm, relations]
dependencies: []
---

# Eliminate Relation Loading Full-Table Scans And 10k Truncation

## Problem Statement

Relation loading currently pulls a fixed 10,000 rows per target/through table and filters in memory. This silently truncates results for tables larger than 10k and performs full-table scans that do not scale with production data size.

## Findings

- `packages/better-convex/src/orm/query.ts:1769-1777` loads all target rows with `take(10_000)` for one() relations, then filters in memory.
- `packages/better-convex/src/orm/query.ts:1931-1977` repeats the pattern for many() and through relations (through table + target table both `take(10_000)`).
- TODO comments indicate missing `withIndex` usage, but the current behavior can return incomplete relation results once datasets exceed the hard cap.

## Proposed Solutions

### Option 1: Indexed Batch Loading Per Key (Preferred)

**Approach:**
- For one() relations, query targets by indexed field(s) per key using `withIndex`.
- For many() relations, query the target index per source key (or per chunk of keys with controlled concurrency).
- For through relations, query the through table by source key via index, extract target IDs, then fetch targets by `_id` (or indexed target fields).

**Pros:**
- Correct results with no hard cap
- Uses Convex indexes for O(log n) lookups
- Avoids full-table scans and large in-memory filters

**Cons:**
- More queries (need concurrency control)
- Requires index availability on relation fields

**Effort:** Medium–Large

**Risk:** Medium (needs careful batching and ordering)

---

### Option 2: Streaming + Pagination

**Approach:**
- Use `convex-helpers/server/stream` to iterate index-backed queries with `filterWith` for complex cases.
- Paginate through results to limit memory use.

**Pros:**
- Scales for large datasets
- Fits Convex guidance for complex filtering

**Cons:**
- More complex implementation
- Streams can’t use `withSearchIndex` and still require indexes for efficiency

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Make Limit Configurable + Explicit Warning

**Approach:**
- Keep `take(10_000)` but make it a configurable cap and surface warnings/errors when truncation occurs.

**Pros:**
- Low change risk
- Minimal code churn

**Cons:**
- Still incorrect for large datasets
- Doesn’t solve scalability

**Effort:** Small

**Risk:** Low

## Recommended Action

**To be filled during triage.**

## Technical Details

**Affected files:**
- `packages/better-convex/src/orm/query.ts:1769`
- `packages/better-convex/src/orm/query.ts:1931`
- `packages/better-convex/src/orm/query.ts:1945`
- `packages/better-convex/src/orm/query.ts:1972`

**Related components:**
- Relation loading (`_loadOneRelation`, `_loadManyRelation`)
- Edge metadata/index configuration

**Database changes:**
- Requires indexes on relation fields for efficient `withIndex` usage

## Resources

- Convex filtering guidance: `.claude/skills/convex-filters/convex-filters.mdc`
- Convex best practices: `.claude/skills/convex/convex.mdc`

## Acceptance Criteria

- [ ] Relations load correctly beyond 10k rows without truncation
- [ ] Full-table scans removed for relation loading
- [ ] Index-backed queries are used for relation lookups
- [ ] Memory usage bounded via batching/streaming
- [ ] Tests cover large relation sets and through relations

## Work Log

### 2026-02-05 - Initial Discovery

**By:** Codex

**Actions:**
- Identified `take(10_000)` usage for relation loading
- Located all relation-loading scan sites and line references
- Outlined indexed and streaming alternatives

**Learnings:**
- Current relation loading silently truncates results beyond 10k
- Indexed, batched loading is required for correctness and scale

## Notes

- Keep concurrency limits in mind to avoid write conflicts or rate limits
