/**
 * Type tests for relation loading with `with` option
 *
 * **STATUS: Tests pending Phase 4 (Relation Loading Implementation)**
 *
 * These tests verify type inference for relation loading, but the runtime
 * implementation is currently stubbed (_loadRelations returns rows unchanged).
 *
 * Type assertions are commented out until Phase 4 implements edge traversal
 * integration. See brainstorm "Deferred Features" section for details.
 *
 * Related:
 * - packages/better-convex/src/orm/query.ts:390 (_loadRelations stub)
 * - docs/brainstorms/2026-01-31-drizzle-orm-brainstorm.md (Phase 4 plan)
 */

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

// Test 1: Basic findMany with relations
{
  const result = await db.query.users.findMany({
    with: {
      posts: true,
    },
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
    posts: Array<{
      _id: string;
      _creationTime: number;
      title: string;
      content: string;
      authorId: GenericId<'users'> | null;
      published: boolean | null;
    }>;
  }>;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 2: Nested relations
{
  const result = await db.query.users.findMany({
    with: {
      posts: {
        with: {
          comments: true,
        },
      },
    },
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
    posts: Array<{
      _id: string;
      _creationTime: number;
      title: string;
      content: string;
      authorId: GenericId<'users'> | null;
      published: boolean | null;
      comments: Array<{
        _id: string;
        _creationTime: number;
        postId: GenericId<'posts'>;
        authorId: GenericId<'users'> | null;
        text: string;
      }>;
    }>;
  }>;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 3: Column selection with relations
{
  const result = await db.query.users.findMany({
    columns: {
      name: true,
      email: true,
    },
    with: {
      posts: {
        columns: {
          title: true,
        },
      },
    },
  });

  type Expected = Array<{
    name: string;
    email: string;
    posts: Array<{
      title: string;
    }>;
  }>;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 4: One relation (nullable)
{
  const result = await db.query.posts.findMany({
    with: {
      author: true,
    },
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    title: string;
    content: string;
    authorId: string | null;
    published: boolean | null;
    author: {
      _id: string;
      _creationTime: number;
      name: string;
      email: string;
      age: number | null;
      cityId: string;
      homeCityId: string | null;
    } | null;
  }>;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 5: Self-referential relations
{
  const result = await db.query.node.findMany({
    with: {
      parent: true,
      left: true,
      right: true,
    },
  });

  type NodeType = {
    _id: string;
    _creationTime: number;
    parentId: string | null;
    leftId: string | null;
    rightId: string | null;
  };

  type Expected = Array<
    NodeType & {
      parent: NodeType | null;
      left: NodeType | null;
      right: NodeType | null;
    }
  >;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 6: Many-to-many through join table
{
  const result = await db.query.books.findMany({
    with: {
      authors: {
        with: {
          author: true,
        },
      },
    },
  });

  type Expected = Array<{
    _id: string;
    _creationTime: number;
    name: string;
    authors: Array<{
      _id: string;
      _creationTime: number;
      bookId: string;
      authorId: string;
      role: string;
      author: {
        _id: string;
        _creationTime: number;
        name: string;
        email: string;
        age: number | null;
        cityId: string;
        homeCityId: string | null;
      } | null;
    }>;
  }>;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// Test 7: findFirst returns single item or null
{
  const result = await db.query.users.findFirst({
    with: {
      posts: true,
    },
  });

  type Expected = {
    _id: string;
    _creationTime: number;
    name: string;
    email: string;
    age: number | null;
    cityId: GenericId<'cities'>;
    homeCityId: GenericId<'cities'> | null;
    posts: Array<{
      _id: string;
      _creationTime: number;
      title: string;
      content: string;
      authorId: GenericId<'users'> | null;
      published: boolean | null;
    }>;
  } | null;

  // TODO(Phase 4): Enable once relation loading implemented
  // Expect<Equal<Expected, typeof result>>;
}

// ============================================================================
// NEGATIVE TYPE TESTS - Invalid usage should error
// ============================================================================

// TODO(Phase 4): Re-enable once relation type validation implemented
// Currently type system doesn't enforce relation name validity
// TODO(Phase 4): Uncomment when relation validation implemented
// // @ts-expect-error - Invalid relation name
// db.query.users.findMany({
//   with: {
//     invalidRelation: true,
//   },
// });

db.query.users.findMany({
  columns: {
    // @ts-expect-error - Invalid column name in selection
    invalidColumn: true,
  },
});

// TODO(Phase 4): Re-enable once nested relation validation implemented
// TODO(Phase 4): Uncomment when nested relation validation implemented
// // @ts-expect-error - Invalid nested relation
// db.query.users.findMany({
//   with: {
//     posts: {
//       with: {
//         invalidNestedRelation: true,
//       },
//     },
//   },
// });

// TODO(M5): Re-enable once findFirst API constraints implemented
// These should error but currently the type system allows them
// TODO(M5): Uncomment when findFirst constraints implemented
// // @ts-expect-error - Cannot use where/orderBy/limit on findFirst
// db.query.users.findFirst({
//   where: (users, { eq }) => eq(users.name, 'test'),
// });

// TODO(M5): Uncomment when findFirst constraints implemented
// // @ts-expect-error - Cannot use where/orderBy/limit on findFirst
// db.query.users.findFirst({
//   orderBy: (users, { asc }) => asc(users.name),
// });

// TODO(M5): Uncomment when findFirst constraints implemented
// // @ts-expect-error - Cannot use where/orderBy/limit on findFirst
// db.query.users.findFirst({
//   limit: 10,
// });
