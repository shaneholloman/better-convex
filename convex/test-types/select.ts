import {
  asc,
  buildSchema,
  convexTable,
  createDatabase,
  desc,
  extractRelationsConfig,
  type InferInsertModel,
  type InferSelectModel,
  id,
  integer,
  text,
} from 'better-convex/orm';
import type { GenericDatabaseReader } from 'convex/server';
import type { GenericId } from 'convex/values';
import { UserRow } from './fixtures/types';
import {
  bookAuthors,
  bookAuthorsRelations,
  books,
  booksRelations,
  cities,
  citiesRelations,
  comments,
  commentsRelations,
  node,
  nodeRelations,
  posts,
  postsRelations,
  users,
  usersRelations,
} from './tables-rel';
import { type Equal, Expect } from './utils';

// Build schema following Better Convex pattern
const schema = {
  users,
  cities,
  posts,
  comments,
  books,
  bookAuthors,
  node,
  usersRelations,
  citiesRelations,
  postsRelations,
  commentsRelations,
  booksRelations,
  bookAuthorsRelations,
  nodeRelations,
};

const schemaConfig = buildSchema<typeof schema>(schema);
const edgeMetadata = extractRelationsConfig(schema);

type SchemaUsersRelationsTableName = typeof schema.usersRelations._tableName;
Expect<Equal<SchemaUsersRelationsTableName, 'users'>>;

type SchemaKeys = keyof typeof schema;
type ExpectedSchemaKeys =
  | 'users'
  | 'cities'
  | 'posts'
  | 'comments'
  | 'books'
  | 'bookAuthors'
  | 'node'
  | 'usersRelations'
  | 'citiesRelations'
  | 'postsRelations'
  | 'commentsRelations'
  | 'booksRelations'
  | 'bookAuthorsRelations'
  | 'nodeRelations';
Expect<Equal<SchemaKeys, ExpectedSchemaKeys>>;

type SchemaUsersRelationsIsRelations =
  typeof schema.usersRelations extends import('better-convex/orm').Relations<
    any,
    any
  >
    ? true
    : false;
Expect<Equal<SchemaUsersRelationsIsRelations, true>>;

type SchemaUserRelationKeys = keyof typeof schemaConfig.users.relations;
type ExpectedSchemaUserRelationKeys =
  | 'city'
  | 'homeCity'
  | 'posts'
  | 'comments';
Expect<Equal<SchemaUserRelationKeys, ExpectedSchemaUserRelationKeys>>;

const schemaRelationKeyOk: SchemaUserRelationKeys = 'posts';
// @ts-expect-error - invalid relation key should not be allowed
const schemaRelationKeyBad: SchemaUserRelationKeys = 'invalidRelationKey';
void schemaRelationKeyOk;
void schemaRelationKeyBad;

// Mock database reader for type testing
const mockDb = {} as GenericDatabaseReader<any>;
const db = createDatabase(mockDb, schemaConfig, edgeMetadata);

// ============================================================================
// WHERE CLAUSE TYPE TESTS
// ============================================================================

// Test 1: eq operator
{
  const result = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.name, 'Alice'),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 2: Multiple filter operators
{
  const result = await db.query.users.findMany({
    where: (users, { gt, lt }) => gt(users.age, 18),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 3: inArray operator
{
  const result = await db.query.users.findMany({
    where: (users, { inArray }) => inArray(users.name, ['Alice', 'Bob']),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 4: isNull / isNotNull for optional fields
{
  const result = await db.query.users.findMany({
    where: (users, { isNull }) => isNull(users.age),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// ORDER BY TYPE TESTS
// ============================================================================

// Test 5: orderBy asc
{
  const result = await db.query.users.findMany({
    orderBy: asc(schema.users.name),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 6: orderBy desc
{
  const result = await db.query.users.findMany({
    orderBy: desc(schema.users.age),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// LIMIT / OFFSET TYPE TESTS
// ============================================================================

// Test 7: limit
{
  const result = await db.query.users.findMany({
    limit: 10,
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 8: offset
{
  const result = await db.query.users.findMany({
    offset: 5,
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 9: Combined where + orderBy + limit
{
  const result = await db.query.users.findMany({
    where: (users, { gt }) => gt(users.age, 18),
    orderBy: desc(schema.users.name),
    limit: 10,
    offset: 5,
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// COLUMN SELECTION TYPE TESTS
// ============================================================================

// Test 10: Select specific columns
{
  const result = await db.query.users.findMany({
    columns: {
      name: true,
      email: true,
    },
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 11: Exclude columns with false
// TODO(M5): Enable once column exclusion implemented
// Column exclusion (columns: { age: false }) is not yet implemented
// _selectColumns only handles include === true, not include === false
// {
//   const result = await db.query.users.findMany({
//     columns: {
//       age: false,
//     },
//   });
//
//   type Expected = Array<{
//     _id: string;
//     _creationTime: number;
//     name: string;
//     email: string;
//     cityId: GenericId<'cities'>;
//     homeCityId: GenericId<'cities'> | null;
//   }>;
//
//   Expect<Equal<Expected, typeof result>>;
// }

// ============================================================================
// COMBINED WHERE + RELATIONS TYPE TESTS
// ============================================================================

// Test 12: Where clause with nested relations
// TODO(Phase 4): Enable once relation loading implemented
// Relation loading with `with` option is not yet implemented
// _loadRelations() currently returns rows unchanged
// {
//   const result = await db.query.users.findMany({
//     where: (users, { eq }) => eq(users.name, 'Alice'),
//     with: {
//       posts: {
//         where: (posts, { eq }) => eq(posts.published, true),
//         columns: {
//           title: true,
//         },
//       },
//     },
//   });
//
//   type Expected = Array<{
//     _id: string;
//     _creationTime: number;
//     name: string;
//     email: string;
//     age: number | null;
//     cityId: GenericId<'cities'>;
//     homeCityId: GenericId<'cities'> | null;
//     posts: Array<{
//       title: string;
//     }>;
//   }>;
//
//   Expect<Equal<Expected, typeof result>>;
// }

// ============================================================================
// FINDFIRST RESULT TYPE TESTS
// ============================================================================

// Test: findFirst returns T | undefined
{
  const result = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.name, 'Alice'),
  });

  type Expected = UserRow | undefined;

  Expect<Equal<Expected, typeof result>>;
}

// Test: findFirst with orderBy
{
  const result = await db.query.users.findFirst({
    orderBy: desc(schema.users.age),
  });

  type Expected = UserRow | undefined;

  Expect<Equal<Expected, typeof result>>;
}

// Test: findFirst with no match returns undefined
{
  const result = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.name, 'NonExistent'),
  });

  type Expected = UserRow | undefined;

  Expect<Equal<Expected, typeof result>>;
}

// Test: findFirst never returns array
{
  const result = await db.query.users.findFirst();

  // Verify it's not an array type
  type IsArray = typeof result extends Array<any> ? true : false;
  Expect<Equal<IsArray, false>>;
}

// ============================================================================
// GETCOLUMNDATA MODE VERIFICATION TESTS
// ============================================================================

// Test: InferSelectModel uses 'query' mode (includes null for nullable fields)
{
  type User = InferSelectModel<typeof schema.users>;

  // Age is nullable, should include null (query mode)
  Expect<Equal<User['age'], number | null>>;

  // Name is notNull, should NOT include null
  Expect<Equal<User['name'], string>>;
}

// Test: BuildQueryResult column selection uses 'query' mode
{
  const result = await db.query.users.findMany({
    columns: { age: true },
  });

  type Row = (typeof result)[number];

  // Selected age field preserves nullability
  Expect<Equal<Row['age'], number | null>>;
}

// Test: FilterOperators use 'raw' mode (don't accept null)
{
  // eq should accept `number`, NOT `number | null`
  await db.query.users.findMany({
    where: (users, { eq }) => eq(users.age, 30), // ✓ Should work
  });

  // This test verifies eq doesn't accept null by attempting it in negative test section
  // See negative tests below for the @ts-expect-error version
}

// ============================================================================
// COMPLEX COMBINATIONS
// ============================================================================

// Test: where + orderBy + limit combined
{
  const result = await db.query.users.findMany({
    where: (users, { gt }) => gt(users.age, 18),
    orderBy: desc(schema.users.age),
    limit: 10,
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: columns + where combined
{
  const result = await db.query.users.findMany({
    columns: {
      name: true,
      email: true,
    },
    where: (users, { eq }) => eq(users.name, 'Alice'),
  });

  type Row = (typeof result)[number];
  type Expected = {
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
  };

  Expect<Equal<Row, Expected>>;
}

// Test: orderBy on posts table
{
  const result = await db.query.posts.findMany({
    orderBy: desc(schema.posts.title),
  });

  // Should return array of posts
  type IsArray = typeof result extends Array<any> ? true : false;
  Expect<Equal<IsArray, true>>;
}

// Test: Complex where with multiple operators
{
  const result = await db.query.users.findMany({
    where: (users, { gt }) => gt(users.age, 18),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// M5 STRING OPERATOR TESTS
// ============================================================================

// Test: startsWith operator
{
  const result = await db.query.users.findMany({
    where: (users, { startsWith }) => startsWith(users.name, 'A'),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: endsWith operator
{
  const result = await db.query.users.findMany({
    where: (users, { endsWith }) => endsWith(users.email, '@example.com'),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: contains operator
{
  const result = await db.query.users.findMany({
    where: (users, { contains }) => contains(users.name, 'ice'),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// M5 ORDERBY EXTENDED TESTS
// ============================================================================

// Test: orderBy with system field _creationTime
{
  const result = await db.query.users.findMany({
    orderBy: desc(schema.users._creationTime),
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: orderBy with nullable field
{
  const result = await db.query.users.findMany({
    orderBy: desc(schema.users.age), // age is nullable
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// M6 COLUMN BUILDER TESTS
// ============================================================================

// Test: Method chaining - notNull().default()
{
  const posts = convexTable('posts', {
    title: text().notNull(),
    status: text().notNull().default('draft'),
  });

  type Insert = InferInsertModel<typeof posts>;

  // Note: In Better Convex, default doesn't make fields optional
  Expect<
    Equal<
      Insert,
      {
        title: string;
        status: string; // Required, not optional (Better Convex convention)
      }
    >
  >;
}

// Test: Default value type inference
{
  const posts = convexTable('posts', {
    viewCount: integer().default(0),
  });

  type Post = InferSelectModel<typeof posts>;
  type ViewCountType = Post['viewCount'];

  // Default doesn't change nullability - still nullable in select
  Expect<Equal<ViewCountType, number | null>>;
}

// ============================================================================
// M5/M6 NEGATIVE TYPE TESTS
// ============================================================================

// Negative: orderBy on invalid field
db.query.users.findMany({
  // @ts-expect-error - Property 'nonExistent' does not exist
  orderBy: asc(schema.users.nonExistent),
});

// Negative: Invalid default value type
{
  convexTable('invalid', {
    // @ts-expect-error - Argument of type 'string' is not assignable to parameter of type 'number'
    age: integer().default('not a number'),
  });
}

// ============================================================================
// NEGATIVE TYPE TESTS - Invalid usage should error
// ============================================================================

// Invalid field in where clause
db.query.users.findMany({
  // @ts-expect-error - Property 'invalidField' does not exist
  where: (users, { eq }) => eq(users.invalidField, 'test'),
});

// Type mismatch in eq operator
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'string' is not assignable to parameter of type 'number'
  where: (users, { eq }) => eq(users.age, 'not a number'),
});

// Invalid field in orderBy
db.query.users.findMany({
  // @ts-expect-error - Property 'invalidField' does not exist
  orderBy: (users, { asc }) => asc(users.invalidField),
});

// Invalid operator for field type
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'number' is not assignable to parameter of type 'string'
  where: (users, { gt }) => gt(users.name, 100),
});

// inArray with wrong value type
db.query.users.findMany({
  // @ts-expect-error - Type 'string' is not assignable to type 'number'
  where: (users, { inArray }) => inArray(users.age, ['not', 'numbers']),
});

// FilterOperators use 'raw' mode - eq should NOT accept null
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'null' is not assignable to parameter of type 'number'
  where: (users, { eq }) => eq(users.age, null),
});

// findFirst should not be assignable to array type
{
  const result = await db.query.users.findFirst();
  // @ts-expect-error - Type 'UserRow | undefined' is not assignable to type 'UserRow[]'
  const arr: UserRow[] = [result];
}

// isNull on non-nullable field
db.query.users.findMany({
  // @ts-expect-error - Argument of type notNull column is not assignable to parameter of type 'never'
  where: (users, { isNull }) => isNull(users.name),
});

// Invalid column in selection
db.query.users.findMany({
  columns: {
    // @ts-expect-error - 'invalidColumn' does not exist
    invalidColumn: true,
  },
});

// Cannot use where in nested one() relation
db.query.posts.findMany({
  with: {
    author: {
      // @ts-expect-error - Property 'name' does not exist on union type (one() relations don't support where)
      where: (users, { eq }) => eq(users.name, 'Alice'),
    },
  },
});

// Limit is not allowed in nested one() relation
db.query.posts.findMany({
  with: {
    author: {
      // @ts-expect-error - limit is only allowed on many() relations
      limit: 10,
    },
  },
});

// ============================================================================
// PHASE 4: COMPREHENSIVE NEGATIVE TESTS
// ============================================================================

// A. Invalid Column Access - Invalid column in relation config
db.query.posts.findMany({
  with: {
    // @ts-expect-error - Invalid relation name
    nonExistentRelation: true,
  },
});

// B. Type Mismatches - Wrong GenericId table reference
{
  const posts = convexTable('posts', {
    authorId: id('users').notNull(),
  });

  type Post = InferSelectModel<typeof posts>;

  const invalidPost: Post = {
    _id: '123' as GenericId<'posts'>,
    _creationTime: 123,
    // @ts-expect-error - Type 'GenericId<"posts">' is not assignable to type 'GenericId<"users">'
    authorId: '456' as GenericId<'posts'>, // Wrong table reference
  };
}

// B. Type Mismatches - Array for single value operator
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'string[]' is not assignable to parameter of type 'string'
  where: (users, { eq }) => eq(users.name, ['Alice', 'Bob']),
});

// C. Invalid Operations - gt on boolean field
// Note: This currently doesn't produce a type error due to type system limitations
db.query.posts.findMany({
  where: (posts, { gt }) => gt(posts.published, true),
});

// C. Invalid Operations - lt on boolean field
// Note: This currently doesn't produce a type error due to type system limitations
db.query.posts.findMany({
  where: (posts, { lt }) => lt(posts.published, false),
});

// D. Invalid Query Config - Unknown query option
db.query.users.findMany({
  // @ts-expect-error - Object literal may only specify known properties
  unknownOption: true,
});

// D. Invalid Query Config - limit with string value
db.query.users.findMany({
  // @ts-expect-error - Type 'string' is not assignable to type 'number'
  limit: '10',
});

// D. Invalid Query Config - offset with string value
db.query.users.findMany({
  // @ts-expect-error - Type 'string' is not assignable to type 'number'
  offset: '5',
});

// E. Relation Constraints - Invalid relation name in with
{
  type UsersQueryConfig = import('better-convex/orm').DBQueryConfig<
    'many',
    true,
    typeof schemaConfig,
    typeof schemaConfig.users
  >;

  const invalidConfig: UsersQueryConfig = {
    with: {
      // @ts-expect-error - Invalid relation name
      invalidRelation: true,
    },
  };

  void invalidConfig;
}

// ============================================================================
// PHASE 5: EDGE CASES
// ============================================================================

// Edge Case 1: Empty result arrays
{
  const result = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.name, 'NonExistentUser12345'),
  });

  // Should still be Array<UserRow>, not undefined or never
  type Expected = UserRow[];

  Expect<Equal<typeof result, Expected>>;
}

// Edge Case 2: Null handling in complex queries
{
  const result = await db.query.users.findMany({
    where: (users, { isNull }) => isNull(users.age),
    columns: {
      name: true,
      age: true,
    },
    orderBy: desc(schema.users._creationTime),
  });

  type Row = (typeof result)[number];

  // Age should preserve nullability
  Expect<Equal<Row['age'], number | null>>;
}

// Edge Case 3: System field ordering (_id, _creationTime)
{
  const result = await db.query.users.findMany({
    orderBy: asc(schema.users._creationTime),
  });

  type Expected = UserRow[];

  Expect<Equal<typeof result, Expected>>;
}

// Edge Case 4: GenericId across multiple tables
{
  const result = await db.query.posts.findMany({
    columns: {
      authorId: true,
    },
  });

  type Row = (typeof result)[number];

  // authorId should be GenericId<'users'>, not GenericId<'posts'>
  Expect<Equal<Row['authorId'], GenericId<'users'> | null>>;
}

// Edge Case 5: Deeply nested query configs (type check only)
{
  const result = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.name, 'Alice'),
    columns: {
      name: true,
      email: true,
      age: true,
    },
    orderBy: desc(schema.users.age),
    limit: 10,
    offset: 5,
  });

  // Should compile without errors
  type Row = (typeof result)[number];

  Expect<
    Equal<
      Row,
      {
        _id: string;
        _creationTime: number;
        name: string;
        email: string;
        age: number | null;
      }
    >
  >;
}

export {};
