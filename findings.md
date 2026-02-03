# Findings: Drizzle Beta.13 Update

## Requirements
- Read changelogs from beta.1 to beta.13 in /tmp/cc-repos/drizzle-v1
- Extract breaking changes, new features, API changes
- Update docs/learn-drizzle.md with beta-specific content
- Maintain backward compatibility info for stable users

## Research Findings

### Phase 1: Beta Changelogs Analysis

**MAJOR BREAKING CHANGES (Beta.1 - Relational Queries v2):**
- Complete relations API rewrite
- `defineRelations()` replaces `relations()` - centralized definition for all tables
- Relation syntax: `r.one.users()`, `r.many.posts()` with autocomplete
- `from`/`to` replaces `fields`/`references` - accepts single value or array
- `alias` replaces `relationName`
- `where` is now object: `{ id: 1 }` (was callback with operators)
- `orderBy` is now object: `{ id: "asc" }` (was callback)
- `.through()` for many-to-many relations
- Predefined filters in relations (where on relation definition)
- Filtering by relations in queries
- `offset` on related objects
- `defineRelationsPart` for splitting relations config (Beta.2)

**Other Breaking Changes:**
- Beta.9: `.array()` not chainable - now `.array('[][]')` for multidimensional
- Beta.12: `.generatedAlwaysAs()` only accepts `sql``` and `() => sql```
- Beta.1: Column encoders/decoders fixed for PG arrays of intervals/timestamps/dates

**New Features:**
- Beta.2: MSSQL dialect support
- Beta.2: CockroachDB dialect support
- Beta.9: Native `@effect/sql-pg` driver
- Beta.9: Query builder supports EffectLike and PromiseLike flows
- Beta.13: Effect integration (makeWithDefaults, EffectLogger.layer, EffectCache)
- Beta.3: MySQL use/force/ignore index accepts unique constraints

**Type System Improvements:**
- Beta.9: PgColumn type chain rework/simplification
- Beta.9: PgArray recursive wrapper removed - dimensions property on PgColumn
- Beta.10: Fixed PgColumn inference with strictNullChecks: false
- Beta.11: Separated date/int-exclusive column methods from common pg builder

**Runtime Changes:**
- Beta.9: MySQL2 default client: Pool instead of CallbackPool
- Beta.11: PgTimestampString timezone default to +00
- Beta.11: Cache only used when explicitly defined
- Beta.10: Tagged error variants for Effect (DrizzleError, DrizzleQueryError, TransactionRollbackError)

**Bug Fixes:**
- Beta.2: 290+ bug fixes from GitHub issues
- Beta.4/5: SQLite drizzle-kit up command changes (unique constraints, foreign key names)
- Beta.7: findFirst TypeError fix
- Beta.12: bun-sqlite, effect-postgres cache, placeholder usage, views, arrayContains

### Phase 2: Stable vs Beta API Comparison

**Relations API Migration (v0.45.1 → v1.0.0-beta.13):**

Stable (v0.45.1):
```ts
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ one, many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

Beta.13:
```ts
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(),
  },
  posts: {
    author: r.one.users({
      from: r.posts.authorId,
      to: r.users.id,
    }),
  },
}));
```

**Migration Mappings:**
| Stable API | Beta API | Notes |
|------------|----------|-------|
| `relations()` | `defineRelations(schema, (r) => ({}))` | Centralized definition |
| `({ one, many })` | `r.one.tableName()`, `r.many.tableName()` | Dot notation with autocomplete |
| `fields: [posts.authorId]` | `from: r.posts.authorId` | Renamed, accepts single or array |
| `references: [users.id]` | `to: r.users.id` | Renamed, accepts single or array |
| `relationName: "author_post"` | `alias: "author_post"` | Renamed |
| Separate relation objects | Single centralized object | All relations in one place |
| `where: (table, { eq }) => eq(table.id, 1)` | `where: { id: 1 }` | Object syntax |
| `orderBy: (table, { asc }) => asc(table.id)` | `orderBy: { id: "asc" }` | Object syntax |

**Query API Changes:**
- Where clauses: Callback → Object syntax
- OrderBy clauses: Callback → Object syntax
- Relations can have predefined filters
- Can filter by relations in queries
- `.through()` method for many-to-many

**Column API Changes:**
- `.array()` not chainable → `.array('[][]')` for multidimensional
- `.generatedAlwaysAs()` only accepts `sql``` and `() => sql```

**New Dialects:**
- MSSQL support (beta.2)
- CockroachDB support (beta.2)

**Effect Integration (beta.9, beta.13):**
- Native `@effect/sql-pg` driver
- `makeWithDefaults()` factory
- `EffectLogger.layer` for Effect-based logging
- `EffectCache` for Effect-based caching

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Read all beta changelogs sequentially | Understand evolution and cumulative changes |
| Keep stable (v0.45.1) examples | Many users not on beta yet |
| Add beta.13 sections where different | Clear migration path |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- Beta repo: /tmp/cc-repos/drizzle-v1 (v1.0.0-beta.13)
- Changelogs: changelogs/drizzle-orm/1.0.0-beta.*.md
- Stable repo: /tmp/cc-repos/drizzle-orm (v0.45.1)
- Current doc: docs/learn-drizzle.md

## Visual/Browser Findings
-

## Summary

**Task Complete:** Successfully updated /docs/learn-drizzle.md with comprehensive v1.0.0-beta.13 changes.

**Coverage:**
- ✅ Relational Queries v2 (defineRelations API)
- ✅ from/to replaces fields/references
- ✅ alias replaces relationName
- ✅ where/orderBy object syntax in relational queries
- ✅ .through() for many-to-many
- ✅ Predefined filters and filtering by relations
- ✅ .array() breaking change
- ✅ .generatedAlwaysAs() breaking change
- ✅ Effect integration
- ✅ MSSQL/CockroachDB dialects
- ✅ Comprehensive migration guide (section 7.5)

**Document Structure:**
- Version notice with 🔶 markers for beta changes
- Side-by-side stable vs beta examples throughout
- Dedicated migration section for stable→beta.13
- All relation types updated (1:1, 1:Many, Many:Many)
- Effect integration in Advanced Patterns

---
*Update after every 2 view/browser/search operations*
