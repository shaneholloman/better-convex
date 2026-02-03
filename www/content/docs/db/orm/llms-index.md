---
title: LLMs Index
description: Structured index of Better-Convex ORM documentation for AI assistants and code completion tools
---

# Better-Convex ORM Documentation Index

**For LLM/AI Discovery**: This file provides a structured index of all Better-Convex ORM documentation for AI assistants and code completion tools.

## Core Concepts (M1-M6.5)

**Getting Started:**
- `/docs/db/orm` - Overview, installation, and value proposition
- `/docs/db/orm/quickstart` - 5-minute tutorial with backend queries

**Schema Definition:**
- `/docs/db/orm/schema` - Table definitions, field types, and type inference

**Relations:**
- `/docs/db/orm/relations` - Define one-to-one, one-to-many, many-to-many relationships

**Querying Data:**
- `/docs/db/orm/queries` - findMany(), findFirst(), paginate(), where filtering, orderBy

**Mutations (Coming Soon):**
- `/docs/db/orm/mutations` - insert(), update(), delete() operations (planned API)

## Migration & Comparison

**Drizzle ORM:**
- `/docs/db/orm/comparison` - Side-by-side API comparison and migration guide

## Reference

**API Documentation:**
- `/docs/db/orm/api-reference` - Complete API surface, all operators, TypeScript signatures

**Limitations & Performance:**
- `/docs/db/orm/limitations` - Category 2/4 features, workarounds, performance guidance

## Quick Reference (M1-M6.5)

### Key APIs

**Schema:**
```ts
convexTable(name, columns)              // Define table
relations(table, callback)             // Define relations
buildSchema(rawSchema)                 // Build typed schema
extractRelationsConfig(schema)         // Build relation edges
```

**Queries (Implemented):**
```ts
const db = createDatabase(ctx.db, ormSchema, ormEdges)

await db.query.table.findMany({
  where: (cols, ops) => ops.eq(cols.field, value),
  orderBy: (cols, { desc }) => desc(cols._creationTime),
  limit: 10,
  offset: 0,
})

await db.query.table.findFirst({
  where: (cols, { eq }) => eq(cols.field, value),
})

await db.query.table.paginate(
  { where: (cols, { eq }) => eq(cols.active, true) },
  { cursor: null, numItems: 20 }
)
```

**Mutations (Not Yet Implemented):**
```ts
// Use native Convex mutations for now:
ctx.db.insert(table, data)
ctx.db.patch(id, data)
ctx.db.delete(id)
```

**Operators (Implemented):**
```ts
eq(field, value)       // Equal
ne(field, value)       // Not equal
gt(field, value)       // Greater than
lt(field, value)       // Less than
gte(field, value)      // Greater than or equal
lte(field, value)      // Less than or equal
and(...conditions)     // Logical AND
or(...conditions)      // Logical OR
not(condition)         // Logical NOT
isNull(field)          // Null/undefined check
isNotNull(field)       // Not null/undefined check
```

### Feature Categories (M1-M6.5)

**✅ Implemented:**
- Schema definition (convexTable, column builders)
- Relations definition and loading (one, many, with)
- Query operations (findMany, findFirst, paginate)
- Where filtering (eq, ne, gt, lt, gte, lte, and, or, not)
- Pagination (limit, offset)
- Order by (multi-field, index-aware first sort)
- Type inference
- Column selection (post-fetch)
- String operators (post-fetch)

**🚧 Coming Soon:**
- Mutations (insert, update, delete)

**⚠️ Limited/Workaround:**
- String operators and column selection are post-fetch
- Relation filters for `many()` are post-fetch

**❌ Not Applicable (SQL-specific):**
- Raw SQL queries
- Database migrations
- Complex SQL JOINs

### Common Patterns

**Basic Query:**
```ts
const users = await db.query.users.findMany();
```

**Filtered Query:**
```ts
const admins = await db.query.users.findMany({
  where: (users, { and, eq, gt }) =>
    and(eq(users.role, 'admin'), gt(users.lastSeen, Date.now() - 86_400_000)),
});
```

**With Pagination:**
```ts
const posts = await db.query.posts.findMany({
  where: (posts, { eq }) => eq(posts.published, true),
  limit: 10,
  offset: 0,
});
```

**Find First:**
```ts
const user = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, 'alice@example.com'),
});
```

**Real-Time (React):**
```ts
const users = useQuery(api.queries.getUsers);
// Automatically updates when data changes
```

## Error Messages & Solutions

**Common errors:**

- `where is not a function` → Use callback form: `where: (cols, ops) => ...`
- `Property 'query' does not exist` → Use `createDatabase(ctx.db, ormSchema, ormEdges)`
- `Type error: missing required field` → Check schema definition for required fields
- `Property '...' does not exist on type` → Field doesn't exist in schema
- `findUnique is not a function` → Use `findFirst` with `where`
- `'include' does not exist` → Use `with` instead of `include`

## Migration Quickstart

**From Drizzle:**

1. Replace imports: `drizzle-orm` → `better-convex/orm`
2. Replace `pgTable` → `convexTable` with column builders
3. Remove manual `id` fields (auto-created as `_id`)
4. Use `buildSchema()` and `extractRelationsConfig()`
5. Create DB instance with `createDatabase(ctx.db, ormSchema, ormEdges)`
6. Keep `where` callback shape
7. Use native Convex mutations for now

## Additional Resources

- GitHub: https://github.com/get-convex/convex-backend
- Discord: https://convex.dev/community
- API Catalog: `/orm/api-catalog.json`
- Error Catalog: `/orm/error-catalog.json`
- Examples Registry: `/orm/examples-registry.json`
