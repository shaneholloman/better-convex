# Drizzle ORM - Quick Reference for Prisma Users

> Concise guide mapping Drizzle patterns to Prisma equivalents. Assumes proficiency in Prisma and Convex.

**Version Note:** Better Convex is upgrading to **Drizzle v1** (canonical PG integration). This doc is migrating to v1-only; legacy v0.45 references will be removed as part of the upgrade.

## Quick Mental Map

```
Prisma                     → Drizzle
schema.prisma DSL          → TypeScript code-first
create()                   → insert().values()
findMany()                 → select().from().where()
update()                   → update().set().where()
delete()                   → delete().where()
upsert()                   → insert().onConflictDoUpdate()
include: { relation }      → with: { relation: true }
select: { field: true }    → returning({ field: table.field })
$transaction()             → transaction()
```

---

## 1. Schema Definition

### Table Definition

**Prisma:**

```prisma
model User {
  id    String @id @default(uuid())
  name  String
  email String?
  age   Int    @default(18)
}
```

**Drizzle:**

```ts
import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email"), // Nullable by default
  age: integer("age").default(18),
});
```

**Key differences:**

- Drizzle: Fluent API (.notNull(), .default(), .primaryKey())
- Prisma: Decorators (@id, @default(), ?)
- Drizzle: Nullable by default, add .notNull() for required
- Prisma: Required by default, add ? for optional

### Column Types (37 types)

| Type    | Drizzle                                  | Notes                 |
| ------- | ---------------------------------------- | --------------------- |
| Text    | `text()`                                 | VARCHAR/TEXT          |
| Integer | `integer()`, `smallint()`, `bigint()`    | Different sizes       |
| Float   | `real()`, `numeric()`, `decimal()`       | Precision control     |
| Boolean | `boolean()`                              |                       |
| Date    | `date()`, `timestamp()`, `timestamptz()` | With/without timezone |
| JSON    | `json()`, `jsonb()`                      | Binary JSON (PG)      |
| UUID    | `uuid()`                                 |                       |
| Enum    | `pgEnum('name', ['a', 'b'])`             | Define before table   |
| Array   | `.array()` on any column                 | PostgreSQL arrays     |

**🔶 Beta.13 Array Breaking Change:**

```ts
// Stable: Chainable .array()
text("tags").array().array(); // 2D array

// Beta.13+: String notation for dimensions
text("tags").array("[][]"); // 2D array
text("tags").array("[][][]"); // 3D array
```

**Modifiers:**

```ts
text("name")
  .notNull() // Required
  .default("guest") // Default value
  .$type<"admin" | "user">() // Branded type
  .unique() // Unique constraint
  .references(() => other.id); // FK
```

### Type Inference

**Prisma:**

```ts
type User = Prisma.User; // SELECT result
type UserCreateInput = Prisma.UserCreateInput; // INSERT input
```

**Drizzle:**

```ts
type User = typeof users.$inferSelect; // SELECT result
type UserInsert = typeof users.$inferInsert; // INSERT input

// Or via helper types
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
type User = InferSelectModel<typeof users>;
type UserInsert = InferInsertModel<typeof users>;
```

**Type rules:**

- `$inferSelect`: All fields, nullable if !notNull
- `$inferInsert`: Required if notNull && !hasDefault, otherwise optional

---

## 2. Relations

### Defining Relations

**Prisma (inline):**

```prisma
model User {
  id    String @id
  posts Post[]
}

model Post {
  id       String @id
  userId   String
  user     User   @relation(fields: [userId], references: [id])
}
```

**Drizzle Stable (v0.45.1 - separate exports):**

```ts
const users = pgTable("users", { id: uuid("id").primaryKey() });
const posts = pgTable("posts", {
  id: uuid("id").primaryKey(),
  userId: uuid("userId").notNull(),
});

// Relations defined AFTER tables
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts), // Implicit reverse
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));
```

**🔶 Drizzle Beta.13+ (centralized `defineRelations`):**

```ts
import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(), // Autocomplete for all tables
  },
  posts: {
    author: r.one.users({
      from: r.posts.userId, // 'from' replaces 'fields'
      to: r.users.id, // 'to' replaces 'references'
    }),
  },
}));
```

**Key differences (Stable):**

- **Both sides must be defined** (Drizzle) vs single source (Prisma)
- `one()` requires explicit fields/references config
- `many()` infers from reverse `one()` definition
- Separate `relations()` export per table

**🔶 Beta.13+ Changes:**

- Single centralized `defineRelations()` for all tables
- `from`/`to` replaces `fields`/`references` (accepts single value or array)
- `alias` replaces `relationName`
- Autocomplete for all tables via `r.one.tableName()`, `r.many.tableName()`
- Optional explicit `from`/`to` for `many()` relations (previously inferred only)

### Relation Types

**1:1 (One-to-one):**

Stable:

```ts
const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
}));
```

🔶 Beta.13+:

```ts
const relations = defineRelations(schema, (r) => ({
  users: {
    profile: r.one.profiles({ from: r.users.id, to: r.profiles.userId }),
  },
}));
```

**1:Many (One-to-many):**

Stable:

```ts
const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
}));
```

🔶 Beta.13+:

```ts
const relations = defineRelations(schema, (r) => ({
  users: {
    posts: r.many.posts(), // Can optionally specify from/to
  },
  posts: {
    author: r.one.users({ from: r.posts.userId, to: r.users.id }),
  },
}));
```

**Many:Many (via junction table):**

Stable:

```ts
const usersRelations = relations(users, ({ many }) => ({
  groups: many(usersToGroups),
}));

const groupsRelations = relations(groups, ({ many }) => ({
  users: many(usersToGroups),
}));

const usersToGroupsRelations = relations(usersToGroups, ({ one }) => ({
  user: one(users, { fields: [usersToGroups.userId], references: [users.id] }),
  group: one(groups, {
    fields: [usersToGroups.groupId],
    references: [groups.id],
  }),
}));
```

🔶 Beta.13+ (with `.through()` method):

```ts
const relations = defineRelations(schema, (r) => ({
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    }),
  },
  groups: {
    users: r.many.users(), // Reverse can be implicit
  },
}));
```

### relationName / alias (Disambiguation)

Required when multiple relations to same table:

Stable (`relationName`):

```ts
const usersRelations = relations(users, ({ one }) => ({
  city: one(cities, {
    relationName: "UsersInCity",
    fields: [users.cityId],
    references: [cities.id],
  }),
  homeCity: one(cities, {
    fields: [users.homeCityId],
    references: [cities.id],
  }),
}));

const citiesRelations = relations(cities, ({ many }) => ({
  users: many(users, { relationName: "UsersInCity" }),
}));
```

🔶 Beta.13+ (`alias` replaces `relationName`):

```ts
const relations = defineRelations(schema, (r) => ({
  users: {
    city: r.one.cities({
      alias: "UsersInCity",
      from: r.users.cityId,
      to: r.cities.id,
    }),
    homeCity: r.one.cities({
      from: r.users.homeCityId,
      to: r.cities.id,
    }),
  },
  cities: {
    users: r.many.users({ alias: "UsersInCity" }),
  },
}));
```

---

## 3. Queries

### Basic Queries

**Prisma:**

```ts
await prisma.user.findMany({
  where: { id: 1 },
  take: 10,
  skip: 5,
});
```

**Drizzle:**

```ts
import { eq } from "drizzle-orm";

await db.select().from(users).where(eq(users.id, 1)).limit(10).offset(5);
```

**API style difference:**

- Prisma: Object config (findMany({ where, take }))
- Drizzle: Method chaining (.from().where().limit())

### Filter Operators

| Operation        | Prisma                         | Drizzle                          |
| ---------------- | ------------------------------ | -------------------------------- |
| Equals           | `{ field: value }`             | `eq(table.field, value)`         |
| Not equals       | `{ field: { not: value } }`    | `ne(table.field, value)`         |
| Greater than     | `{ field: { gt: value } }`     | `gt(table.field, value)`         |
| Greater/equal    | `{ field: { gte: value } }`    | `gte(table.field, value)`        |
| Less than        | `{ field: { lt: value } }`     | `lt(table.field, value)`         |
| Less/equal       | `{ field: { lte: value } }`    | `lte(table.field, value)`        |
| IN array         | `{ field: { in: [] } }`        | `inArray(table.field, [])`       |
| NOT IN           | `{ field: { notIn: [] } }`     | `notInArray(table.field, [])`    |
| LIKE             | `{ field: { contains: 'x' } }` | `like(table.field, '%x%')`       |
| Case-insensitive | N/A (mode param)               | `ilike(table.field, '%x%')`      |
| IS NULL          | `{ field: null }`              | `isNull(table.field)`            |
| IS NOT NULL      | `{ field: { not: null } }`     | `isNotNull(table.field)`         |
| BETWEEN          | N/A (use gte+lte)              | `between(table.field, min, max)` |

**All operators:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `inArray`, `notInArray`, `isNull`, `isNotNull`, `between`, `notBetween`, `exists`, `notExists`

### Logical Operators

**Prisma:**

```ts
where: {
  AND: [{ name: "John" }, { age: { gt: 18 } }];
}
```

**Drizzle:**

```ts
import { and, or, not } from 'drizzle-orm';

.where(and(
  eq(users.name, 'John'),
  gt(users.age, 18)
))
```

**Auto-filtering undefined:**

```ts
// Clean optional filters
const filters = [
  eq(users.status, 'active'),
  name ? eq(users.name, name) : undefined,  // Filtered out if undefined
  minAge ? gte(users.age, minAge) : undefined
];

.where(and(...filters))  // Drizzle auto-removes undefined
```

Prisma requires manual `...(name && { name })` spreading.

### Ordering & Pagination

**Prisma:**

```ts
orderBy: [{ year: "desc" }, { price: "asc" }];
take: 10;
skip: 20;
```

**Drizzle:**

```ts
import { asc, desc } from 'drizzle-orm';

.orderBy(desc(cars.year), asc(cars.price))
.limit(10)
.offset(20)
```

### Column Selection

**Prisma:**

```ts
select: { id: true, name: true }
// OR
omit: { password: true }
```

**Drizzle:**

```ts
db.select({
  id: users.id,
  name: users.name,
}).from(users);
```

**Difference:** Drizzle requires explicit column mapping (structural), Prisma supports select/omit patterns.

### Loading Relations

**Prisma:**

```ts
include: {
  posts: {
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  }
}
```

**Drizzle Stable:**

```ts
await db.query.users.findMany({
  with: {
    posts: {
      where: (posts, { eq }) => eq(posts.published, true),
      orderBy: (posts, { desc }) => desc(posts.createdAt),
      limit: 5,
    },
  },
});
```

**🔶 Drizzle Beta.13+ (Object Syntax):**

```ts
await db.query.users.findMany({
  with: {
    posts: {
      where: { published: true }, // Object syntax
      orderBy: { createdAt: "desc" }, // Object syntax
      limit: 5,
      offset: 2, // Beta.13+ supports offset on relations
    },
  },
});
```

**🔶 Beta.13+ Filtering by Relations:**

```ts
// Get users with posts containing 'M'
await db.query.users.findMany({
  where: { id: { gt: 10 } },
  posts: {
    // Filter by related table
    content: { like: "M%" },
  },
});
```

**🔶 Beta.13+ Predefined Filters in Relations:**

```ts
// Define filtered relation in schema
const relations = defineRelations(schema, (r) => ({
  groups: {
    verifiedUsers: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
      where: { verified: true }, // Predefined filter
    }),
  },
}));

// Use predefined filter
await db.query.groups.findMany({
  with: { verifiedUsers: true }, // Only verified users loaded
});
```

**Type inference:**

```ts
// Result type: User & { posts: Post[] }
const users = await db.query.users.findMany({ with: { posts: true } });
```

**Nullable relations:**

- `one()` relation nullable if any FK field is nullable
- `many()` always returns TResult[]

---

## 4. Mutations

### Insert

**Prisma:**

```ts
await prisma.user.create({ data: { name: "John" } });
await prisma.user.createMany({ data: [{ name: "John" }, { name: "Jane" }] });
```

**Drizzle:**

```ts
await db.insert(users).values({ name: "John" });
await db.insert(users).values([{ name: "John" }, { name: "Jane" }]);
```

**With returning:**

```ts
// Prisma - auto-returns created record
const user = await prisma.user.create({ data: {...} })

// Drizzle - explicit .returning(), ALWAYS array
const [user] = await db.insert(users)
  .values({ name: 'John' })
  .returning()

// Partial fields
const [user] = await db.insert(users)
  .values({ name: 'John' })
  .returning({ id: users.id, name: users.name })
```

**Critical: `.returning()` always returns array, even for single insert.**

### Update

**Prisma:**

```ts
await prisma.user.update({
  where: { id: 1 },
  data: { name: "Jane" },
});
```

**Drizzle:**

```ts
await db.update(users).set({ name: "Jane" }).where(eq(users.id, 1));

// With returning
const [updated] = await db
  .update(users)
  .set({ name: "Jane" })
  .where(eq(users.id, 1))
  .returning({ id: users.id, name: users.name });
```

### Delete

**Prisma:**

```ts
await prisma.user.delete({ where: { id: 1 } });
await prisma.user.deleteMany({ where: { age: { lt: 18 } } });
```

**Drizzle:**

```ts
await db.delete(users).where(eq(users.id, 1));
await db.delete(users).where(lt(users.age, 18));

// With returning
const deleted = await db.delete(users).where(eq(users.id, 1)).returning();
```

**Danger: `.where()` is optional - can delete all rows!**

### Upsert / On Conflict

**Prisma:**

```ts
await prisma.user.upsert({
  where: { id: 1 },
  update: { name: "Updated" },
  create: { id: 1, name: "New" },
});
```

**Drizzle:**

```ts
await db
  .insert(users)
  .values({ id: 1, name: "New" })
  .onConflictDoUpdate({
    target: users.id,
    set: { name: "Updated" },
  });

// Or ignore duplicates
await db
  .insert(users)
  .values({ id: 1, name: "John" })
  .onConflictDoNothing({ target: users.id });
```

**Advanced - conditional update:**

```ts
.onConflictDoUpdate({
  target: users.id,
  set: { name: 'Updated' },
  targetWhere: sql`${users.createdAt} > '2023-01-01'::date`
})
```

### Transactions

**Prisma:**

```ts
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: {...} })
  const post = await tx.post.create({ data: { userId: user.id } })
  return { user, post }
})
```

**Drizzle:**

```ts
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({...}).returning()
  const [post] = await tx.insert(posts).values({ userId: user.id }).returning()
  return { user, post }
})
```

**Auto-rollback on error:**

```ts
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: "John" });
  throw new Error("Rollback!"); // Transaction rolls back
});
```

---

## 5. Advanced Patterns

### Common Table Expressions (WITH)

**Drizzle (native CTE support):**

```ts
const avgPrice = db
  .$with("avg_price")
  .as(db.select({ value: sql`avg(${products.price})` }).from(products));

await db
  .with(avgPrice)
  .select()
  .from(products)
  .where(lt(products.price, sql`(select * from ${avgPrice})`));
```

Prisma: No native CTE support (use raw SQL).

### Raw SQL Integration

**Prisma:**

```ts
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;
```

**Drizzle:**

```ts
import { sql } from "drizzle-orm";

await db
  .execute(sql`SELECT * FROM users WHERE id = ${id}`)

  // Or inline in queries
  .where(sql`lower(${users.email}) = lower(${email})`);
```

**Drizzle advantage:** `sql` template tag integrates seamlessly with type-safe queries.

### Prepared Statements

**Drizzle (explicit prepare):**

```ts
const insertStmt = db
  .insert(users)
  .values({ name: "John" })
  .prepare("insertStmt");

await insertStmt.execute(); // Reusable prepared statement
```

Prisma: Auto-prepared internally.

### Subqueries

**Drizzle:**

```ts
.where(exists(
  db.select().from(posts)
    .where(eq(posts.userId, users.id))
))
```

Prisma: Limited support (use raw SQL).

### 🔶 Effect Integration (Beta.13+)

Beta.13+ adds native Effect support with `@effect/sql-pg` driver:

**Basic Usage:**

```ts
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { PgClient } from "@effect/sql-pg";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

const PgClientLive = PgClient.layer({
  url: Redacted.make(process.env.DATABASE_URL!),
});

const program = Effect.gen(function* () {
  const db = yield* PgDrizzle.makeWithDefaults();
  const result = yield* db.select().from(usersTable);
  return result;
});

Effect.runPromise(program.pipe(Effect.provide(PgClientLive)));
```

**Effect Logger:**

```ts
import { EffectLogger } from "drizzle-orm/effect-postgres";

const db =
  yield *
  PgDrizzle.make({ schema, relations }).pipe(
    Effect.provide(EffectLogger.layer), // Effect-based logging
    Effect.provide(PgDrizzle.DefaultServices)
  );
```

**Tagged Errors:**

```ts
const result =
  yield *
  db
    .select()
    .from(usersTable)
    .pipe(
      Effect.catchTag("DrizzleQueryError", (e) => {
        console.error("Query failed:", e);
        return Effect.succeed([]);
      })
    );
```

**Other Beta.13+ Dialects:**

- MSSQL support (`drizzle-orm/mssql-core`)
- CockroachDB support (`drizzle-orm/pg-core`)

---

## 6. Type Utilities

### Mode-Based Type Extraction

**GetColumnData<Column, 'query' | 'raw'>:**

- `'query'` mode → SELECT result type (with null tracking)
- `'raw'` mode → INSERT/UPDATE input type

```ts
import type { GetColumnData } from "drizzle-orm";

type UserName = GetColumnData<typeof users.name, "query">; // string
type UserEmail = GetColumnData<typeof users.email, "query">; // string | null
```

### Required vs Optional Fields

**INSERT type rules:**

```ts
// Required if: notNull: true && hasDefault: false && !generated
// Optional if: hasDefault: true || generated || nullable
```

**SELECT type rules:**

```ts
// notNull: true  → T
// notNull: false → T | null
```

### Branded Types

**Use .$type<T>() for branded types:**

```ts
const users = pgTable("users", {
  id: uuid("id").$type<UserId>().primaryKey(),
  role: text("role").$type<"admin" | "user">().notNull(),
});

type UserId = string & { __brand: "UserId" };
```

---

## 7. Migration from Prisma

### Schema Migration Checklist

1. **Convert model → pgTable:**
   - @id → .primaryKey()
   - @default(uuid()) → .defaultRandom()
   - @default(autoincrement()) → .serial()
   - ? → remove (nullable by default)
   - Required → add .notNull()

2. **Extract relations:**
   - Create separate `relations()` exports
   - Convert @relation → one()/many()
   - Map fields/references explicitly for one()

3. **Update queries:**
   - findMany/findFirst → db.query.table.findMany() or db.select().from()
   - where object → operator functions (eq, gt, etc.)
   - include → with
   - select → returning or db.select({ ... })

4. **Update mutations:**
   - create → insert().values()
   - update → update().set().where()
   - delete → delete().where()
   - upsert → insert().onConflictDoUpdate()
   - Add .returning() for created/updated data

5. **Type imports:**
   - Prisma.User → typeof users.$inferSelect
   - Prisma.UserCreateInput → typeof users.$inferInsert

### Common Gotchas

| Issue                   | Prisma                     | Drizzle                  | Solution                          |
| ----------------------- | -------------------------- | ------------------------ | --------------------------------- |
| **Nullable by default** | Required by default        | Nullable by default      | Add .notNull()                    |
| **Returning type**      | Single object              | Array                    | Destructure: `const [user] = ...` |
| **Delete all rows**     | Not possible without where | Possible (no guard)      | Always add .where()               |
| **Auto-increment**      | @default(autoincrement())  | .serial() or .identity() | Use PG-specific types             |
| **JSON type**           | Use Prisma.JsonValue       | Use any or branded type  | Define custom JsonValue type      |

---

## 🔶 7.5. Migration from Stable (v0.45.1) to Beta.13+

### Breaking Changes Checklist

1. **Relations API - Major Rewrite:**

   ```ts
   // OLD (v0.45.1)
   export const usersRelations = relations(users, ({ many }) => ({
     posts: many(posts),
   }));
   export const postsRelations = relations(posts, ({ one }) => ({
     user: one(users, {
       fields: [posts.userId],
       references: [users.id],
     }),
   }));

   // NEW (Beta.13+)
   import { defineRelations } from "drizzle-orm";
   import * as schema from "./schema";

   export const relations = defineRelations(schema, (r) => ({
     users: {
       posts: r.many.posts(),
     },
     posts: {
       author: r.one.users({
         from: r.posts.userId, // 'from' replaces 'fields'
         to: r.users.id, // 'to' replaces 'references'
       }),
     },
   }));
   ```

2. **Relational Query Syntax:**

   ```ts
   // OLD: Callback syntax
   db.query.users.findMany({
     where: (users, { eq }) => eq(users.id, 1),
     orderBy: (users, { desc }) => desc(users.createdAt),
     with: {
       posts: {
         where: (posts, { eq }) => eq(posts.published, true),
       },
     },
   });

   // NEW: Object syntax
   db.query.users.findMany({
     where: { id: 1 },
     orderBy: { createdAt: "desc" },
     with: {
       posts: {
         where: { published: true },
       },
     },
   });
   ```

3. **Array Columns:**

   ```ts
   // OLD: Chainable
   text("tags").array().array(); // 2D array

   // NEW: String notation
   text("tags").array("[][]"); // 2D array
   ```

4. **Generated Columns:**

   ```ts
   // OLD: Accepts raw SQL strings
   .generatedAlwaysAs(sql`column1 + column2`)

   // NEW: Only accepts sql`` tagged template
   .generatedAlwaysAs(sql`column1 + column2`)  // Still works
   .generatedAlwaysAs(() => sql`column1 + column2`)  // Or callback
   ```

5. **Import Changes:**
   - `relationName` → `alias`
   - `fields` → `from`
   - `references` → `to`

### New Features in Beta.13+

- **Many-to-many with `.through()`:**

  ```ts
  users: {
    groups: r.many.groups({
      from: r.users.id.through(r.usersToGroups.userId),
      to: r.groups.id.through(r.usersToGroups.groupId),
    });
  }
  ```

- **Predefined filters in relations:**

  ```ts
  groups: {
    verifiedUsers: r.many.users({
      from: r.groups.id.through(r.usersToGroups.groupId),
      to: r.users.id.through(r.usersToGroups.userId),
      where: { verified: true },
    });
  }
  ```

- **Filtering by relations:**

  ```ts
  db.query.users.findMany({
    where: { id: { gt: 10 } },
    posts: { content: { like: "M%" } }, // Filter by related table
  });
  ```

- **Offset on related objects:**

  ```ts
  with: {
    comments: {
      offset: 3,
      limit: 3
    }
  }
  ```

- **Effect integration** (see Section 5)
- **MSSQL and CockroachDB dialects**

---

## 8. Key Differences Summary

| Aspect                  | Prisma                    | Drizzle                      |
| ----------------------- | ------------------------- | ---------------------------- |
| **Schema format**       | DSL (.prisma)             | TypeScript code-first        |
| **Relations**           | Single source (@relation) | Both sides (relations())     |
| **Query style**         | Object config             | Method chaining              |
| **Type inference**      | Schema parsing + codegen  | Generics + conditional types |
| **Metadata storage**    | Schema file               | Symbols on objects           |
| **Runtime**             | Full ORM + migrations     | Thin SQL wrapper             |
| **Flexibility**         | Higher-level abstractions | SQL-focused, more control    |
| **Raw SQL**             | $queryRaw (separate)      | sql template (integrated)    |
| **Prepared statements** | Automatic                 | Optional explicit            |
| **Returning clause**    | Auto for create/update    | Explicit .returning()        |

---

## 9. When to Choose Drizzle

**Choose Drizzle if:**

- ✅ You want full SQL control with type safety
- ✅ You prefer TypeScript code-first schemas
- ✅ You need advanced SQL features (CTEs, lateral joins, etc.)
- ✅ You want lightweight runtime (thin wrapper)
- ✅ You mix raw SQL with ORM frequently

**Choose Prisma if:**

- ✅ You prefer schema DSL over TypeScript
- ✅ You want automatic migrations
- ✅ You need Prisma Studio for admin UI
- ✅ You prefer higher-level abstractions
- ✅ You want first-class MongoDB/raw SQL support

---

## 10. Resources

- **Drizzle repo:** https://github.com/drizzle-team/drizzle-orm
- **PostgreSQL adapter:** /tmp/cc-repos/drizzle-orm/drizzle-orm/src/pg-core/
- **Relations:** /tmp/cc-repos/drizzle-orm/drizzle-orm/src/relations.ts
- **Query builders:** /tmp/cc-repos/drizzle-orm/drizzle-orm/src/pg-core/query-builders/
- **Integration tests:** /tmp/cc-repos/drizzle-orm/integration-tests/tests/pg/

---

**Pro tip:** For Better-Convex ORM implementation, focus on:

- Symbol-based metadata storage (Drizzle pattern)
- Type inference via GetColumnData modes
- Relational query builder with `with` option
- Promise-based lazy execution (QueryPromise pattern)
- Builder → Instance duality for columns
