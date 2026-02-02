import {
  buildSchema,
  createDatabase,
  extractRelationsConfig,
} from 'better-convex/orm';
import type { GenericDatabaseReader } from 'convex/server';
import type { GenericId } from 'convex/values';
import * as schema from './tables-rel';
import { type Equal, Expect } from './utils';

// Build schema following Better Convex pattern
const rawSchema = {
  users: schema.users,
  cities: schema.cities,
  posts: schema.posts,
  comments: schema.comments,
  books: schema.books,
  bookAuthors: schema.bookAuthors,
  node: schema.node,
  usersRelations: schema.usersRelations,
  citiesRelations: schema.citiesRelations,
  postsRelations: schema.postsRelations,
  commentsRelations: schema.commentsRelations,
  booksRelations: schema.booksRelations,
  bookAuthorsRelations: schema.bookAuthorsRelations,
  nodeRelations: schema.nodeRelations,
};

const schemaConfig = buildSchema(rawSchema);
const edgeMetadata = extractRelationsConfig(rawSchema);

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

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 2: Multiple filter operators
{
  const result = await db.query.users.findMany({
    where: (users, { gt, lt }) => gt(users.age, 18),
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 3: inArray operator
{
  const result = await db.query.users.findMany({
    where: (users, { inArray }) => inArray(users.name, ['Alice', 'Bob']),
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 4: isNull / isNotNull for optional fields
{
  const result = await db.query.users.findMany({
    where: (users, { isNull }) => isNull(users.age),
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// ORDER BY TYPE TESTS
// ============================================================================

// Test 5: orderBy asc
{
  const result = await db.query.users.findMany({
    orderBy: (users, { asc }) => asc(users.name),
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 6: orderBy desc
{
  const result = await db.query.users.findMany({
    orderBy: (users, { desc }) => desc(users.age),
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

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

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 8: offset
{
  const result = await db.query.users.findMany({
    offset: 5,
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

  Expect<Equal<Expected, typeof result>>;
}

// Test 9: Combined where + orderBy + limit
{
  const result = await db.query.users.findMany({
    where: (users, { gt }) => gt(users.age, 18),
    orderBy: (users, { desc }) => desc(users.name),
    limit: 10,
    offset: 5,
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
  }>;

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

// TODO: Should not allow limit in nested one() relation (not yet implemented)
// Currently the type system allows this but it should be an error
db.query.posts.findMany({
  with: {
    author: {
      limit: 10,
    },
  },
});
