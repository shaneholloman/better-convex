import {
  convexTable,
  createDatabase,
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
  books,
  cities,
  comments,
  node,
  posts,
  relations,
  users,
} from './tables-rel';
import { type Equal, Expect } from './utils';

// Build schema following Better Convex pattern
const schemaConfig = relations;
const edgeMetadata = extractRelationsConfig(relations);

type SchemaUsersName = typeof schemaConfig.users.name;
Expect<Equal<SchemaUsersName, 'users'>>;

type SchemaKeys = keyof typeof schemaConfig;
type ExpectedSchemaKeys =
  | 'users'
  | 'cities'
  | 'posts'
  | 'comments'
  | 'books'
  | 'bookAuthors'
  | 'node';
Expect<Equal<SchemaKeys, ExpectedSchemaKeys>>;

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
    where: { name: 'Alice' },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 2: Multiple filter operators
{
  const result = await db.query.users.findMany({
    where: { age: { gt: 18, lt: 65 } },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 3: inArray operator
{
  const result = await db.query.users.findMany({
    where: { name: { in: ['Alice', 'Bob'] } },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 4: isNull / isNotNull for optional fields
{
  const result = await db.query.users.findMany({
    where: { age: { isNull: true } },
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
    orderBy: { name: 'asc' },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test 6: orderBy desc
{
  const result = await db.query.users.findMany({
    orderBy: { age: 'desc' },
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
    where: { age: { gt: 18 } },
    orderBy: { name: 'desc' },
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
//     where: { name: 'Alice' },
//     with: {
//       posts: {
//         where: { published: true },
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
    where: { name: 'Alice' },
  });

  type Expected = UserRow | undefined;

  Expect<Equal<Expected, typeof result>>;
}

// Test: findFirst with orderBy
{
  const result = await db.query.users.findFirst({
    orderBy: { age: 'desc' },
  });

  type Expected = UserRow | undefined;

  Expect<Equal<Expected, typeof result>>;
}

// Test: findFirst with no match returns undefined
{
  const result = await db.query.users.findFirst({
    where: { name: 'NonExistent' },
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
  type User = InferSelectModel<typeof users>;

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

// Test: Filter values use 'raw' mode (don't accept null)
{
  // eq should accept `number`, NOT `number | null`
  await db.query.users.findMany({
    where: { age: 30 }, // ✓ Should work
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
    where: { age: { gt: 18 } },
    orderBy: { age: 'desc' },
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
    where: { name: 'Alice' },
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
    orderBy: { title: 'desc' },
  });

  // Should return array of posts
  type IsArray = typeof result extends Array<any> ? true : false;
  Expect<Equal<IsArray, true>>;
}

// Test: Complex where with multiple operators
{
  const result = await db.query.users.findMany({
    where: { age: { gt: 18 } },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// M5 STRING OPERATOR TESTS
// ============================================================================

// Test: like prefix pattern
{
  const result = await db.query.users.findMany({
    where: { name: { like: 'A%' } },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: like suffix pattern
{
  const result = await db.query.users.findMany({
    where: { email: { like: '%@example.com' } },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: like substring pattern
{
  const result = await db.query.users.findMany({
    where: { name: { like: '%ice%' } },
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
    orderBy: { _creationTime: 'desc' },
  });

  type Expected = UserRow[];

  Expect<Equal<Expected, typeof result>>;
}

// Test: orderBy with nullable field
{
  const result = await db.query.users.findMany({
    orderBy: { age: 'desc' }, // age is nullable
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
  orderBy: { nonExistent: 'asc' },
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
  where: { invalidField: 'test' },
});

// Type mismatch in eq operator
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'string' is not assignable to parameter of type 'number'
  where: { age: 'not a number' },
});

// Invalid field in orderBy
db.query.users.findMany({
  // @ts-expect-error - Property 'invalidField' does not exist
  orderBy: (users, { asc }) => asc(users.invalidField),
});

// Invalid operator for field type
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'number' is not assignable to parameter of type 'string'
  where: { name: { gt: 100 } },
});

// inArray with wrong value type
db.query.users.findMany({
  // @ts-expect-error - Type 'string' is not assignable to type 'number'
  where: { age: { in: ['not', 'numbers'] } },
});

// FilterOperators use 'raw' mode - eq should NOT accept null
db.query.users.findMany({
  // @ts-expect-error - Argument of type 'null' is not assignable to parameter of type 'number'
  where: { age: null },
});

// findFirst should not be assignable to array type
{
  const result = await db.query.users.findFirst();
  // @ts-expect-error - Type 'UserRow | undefined' is not assignable to type 'UserRow[]'
  const arr: UserRow[] = [result];
}

// isNull expects boolean
db.query.users.findMany({
  // @ts-expect-error - Type 'string' is not assignable to type 'true'
  where: { name: { isNull: 'nope' } },
});

// Invalid column in selection
db.query.users.findMany({
  columns: {
    // @ts-expect-error - 'invalidColumn' does not exist
    invalidColumn: true,
  },
});

// Where in nested one() relation (allowed)
db.query.posts.findMany({
  with: {
    author: {
      where: { name: 'Alice' },
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
  // @ts-expect-error - Type 'number' is not assignable to type 'string'
  where: { name: { eq: 123 } },
});

// C. Invalid Operations - gt on boolean field
// Note: This currently doesn't produce a type error due to type system limitations
db.query.posts.findMany({
  where: { published: { gt: true } },
});

// C. Invalid Operations - lt on boolean field
// Note: This currently doesn't produce a type error due to type system limitations
db.query.posts.findMany({
  where: { published: { lt: false } },
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
    where: { name: 'NonExistentUser12345' },
  });

  // Should still be Array<UserRow>, not undefined or never
  type Expected = UserRow[];

  Expect<Equal<typeof result, Expected>>;
}

// Edge Case 2: Null handling in complex queries
{
  const result = await db.query.users.findMany({
    where: { age: { isNull: true } },
    columns: {
      name: true,
      age: true,
    },
    orderBy: { _creationTime: 'desc' },
  });

  type Row = (typeof result)[number];

  // Age should preserve nullability
  Expect<Equal<Row['age'], number | null>>;
}

// Edge Case 3: System field ordering (_id, _creationTime)
{
  const result = await db.query.users.findMany({
    orderBy: { _creationTime: 'asc' },
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
    where: { name: 'Alice' },
    columns: {
      name: true,
      email: true,
      age: true,
    },
    orderBy: { age: 'desc' },
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
