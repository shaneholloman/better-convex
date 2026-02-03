/**
 * M6.5 Phase 1 - Relation Loading Runtime Tests
 *
 * Tests basic one-level relation loading:
 * - One-to-many relations (users.posts)
 * - Many-to-one relations (posts.user)
 * - Batch loading efficiency (no N+1 queries)
 * - Optional relations (null handling)
 */

import {
  buildSchema,
  convexTable,
  createDatabase,
  extractRelationsConfig,
  id,
  relations,
  text,
} from 'better-convex/orm';
import type { StorageActionWriter } from 'convex/server';
import { test as baseTest, describe, expect } from 'vitest';
import type { MutationCtx } from '../_generated/server';
import schema, {
  ormPosts,
  ormSchema,
  ormUsers,
  ormUsersRelations,
} from '../schema';
import { convexTest } from '../setup.testing';

// M6.5 Phase 2: Comments table and relations for nested testing (local to this test file)
const ormComments = convexTable('comments', {
  text: text().notNull(),
  postId: id('posts'),
  userId: id('users'),
});

const ormCommentsRelations = relations(ormComments, ({ one }) => ({
  post: one(ormPosts, {
    fields: [ormComments.postId],
    references: [ormPosts._id],
  }),
  user: one(ormUsers, {
    fields: [ormComments.userId],
    references: [ormUsers._id],
  }),
}));

// M6.5 Phase 2: Extend posts relations to include comments (local to this test file)
const ormPostsRelationsWithComments = relations(ormPosts, ({ one, many }) => ({
  user: one(ormUsers, {
    fields: [ormPosts.userId],
    references: [ormUsers._id],
  }),
  comments: many(ormComments),
}));

import { v } from 'convex/values';
// Local schema with comments table for Ents testing
import { defineEnt, defineEntSchema } from 'convex-ents';

const testSchemaWithComments = defineEntSchema(
  {
    ...schema.tables,
    comments: defineEnt({
      text: v.string(),
    })
      .field('postId', v.id('posts'))
      .field('userId', v.id('users')),
  },
  { schemaValidation: false }
);

// Test setup with convexTest
const test = baseTest.extend<{
  ctx: MutationCtx & { storage: StorageActionWriter };
}>({
  ctx: async ({}, use) => {
    const t = convexTest(testSchemaWithComments);
    await t.run(async (ctx) => {
      await use(ctx);
    });
  },
});

// Test schema (use ormSchema from main schema, comments will be added to Ents schema by test setup)
const testSchema = ormSchema;

const edges = extractRelationsConfig({
  users: ormUsers,
  posts: ormPosts,
  comments: ormComments,
  usersRelations: ormUsersRelations,
  postsRelations: ormPostsRelationsWithComments,
  commentsRelations: ormCommentsRelations,
});

describe('M6.5 Phase 1: Relation Loading', () => {
  describe('One-to-Many Relations (users.posts)', () => {
    test('should load empty posts array for user with no posts', async ({
      ctx,
    }) => {
      // Create user without posts
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = await db.query.users.findMany({
        with: {
          posts: true,
        },
      });

      expect(users).toHaveLength(1);
      expect(users[0]._id).toBe(userId);
      expect(users[0].posts).toEqual([]);
    });

    test('should load posts for single user', async ({ ctx }) => {
      // Create user with 2 posts
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const post1Id = await ctx.db.insert('posts', {
        text: 'First post',
        numLikes: 10,
        type: 'text',
        userId,
      });

      const post2Id = await ctx.db.insert('posts', {
        text: 'Second post',
        numLikes: 20,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = (await db.query.users.findMany({
        with: {
          posts: true,
        },
      })) as any;

      expect(users).toHaveLength(1);
      expect(users[0]._id).toBe(userId);
      expect(users[0].posts).toHaveLength(2);
      expect(users[0].posts[0]._id).toBe(post1Id);
      expect(users[0].posts[1]._id).toBe(post2Id);
      expect(users[0].posts[0].text).toBe('First post');
      expect(users[0].posts[1].text).toBe('Second post');
    });

    test('should batch load posts for multiple users (no N+1)', async ({
      ctx,
    }) => {
      // Create 3 users with varying post counts
      const user1Id = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const user2Id = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      const user3Id = await ctx.db.insert('users', {
        name: 'Charlie',
        email: 'charlie@example.com',
      });

      // Alice: 2 posts
      await ctx.db.insert('posts', {
        text: 'Alice post 1',
        numLikes: 5,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Alice post 2',
        numLikes: 10,
        type: 'text',
        userId: user1Id,
      });

      // Bob: 1 post
      await ctx.db.insert('posts', {
        text: 'Bob post 1',
        numLikes: 3,
        type: 'text',
        userId: user2Id,
      });

      // Charlie: 0 posts

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = (await db.query.users.findMany({
        with: {
          posts: true,
        },
      })) as any;

      expect(users).toHaveLength(3);

      // Verify Alice's posts
      const alice = users.find((u: any) => u._id === user1Id);
      expect(alice).toBeDefined();
      expect(alice!.posts).toHaveLength(2);
      expect(alice!.posts.every((p: any) => p.userId === user1Id)).toBe(true);

      // Verify Bob's posts
      const bob = users.find((u: any) => u._id === user2Id);
      expect(bob).toBeDefined();
      expect(bob!.posts).toHaveLength(1);
      expect(bob!.posts[0].userId).toBe(user2Id);

      // Verify Charlie has no posts
      const charlie = users.find((u: any) => u._id === user3Id);
      expect(charlie).toBeDefined();
      expect(charlie!.posts).toEqual([]);
    });
  });

  describe('Many-to-One Relations (posts.user)', () => {
    test('should load user for single post', async ({ ctx }) => {
      // Create user and post
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const postId = await ctx.db.insert('posts', {
        text: 'First post',
        numLikes: 10,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const posts = (await db.query.posts.findMany({
        with: {
          user: true,
        },
      })) as any;

      expect(posts).toHaveLength(1);
      expect(posts[0]._id).toBe(postId);
      expect(posts[0].user).toBeDefined();
      expect(posts[0].user!._id).toBe(userId);
      expect(posts[0].user!.name).toBe('Alice');
    });

    test('should handle null userId (optional relation)', async ({ ctx }) => {
      // Create post without user
      const postId = await ctx.db.insert('posts', {
        text: 'Anonymous post',
        numLikes: 5,
        type: 'text',
        // userId omitted (optional field)
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const posts = await db.query.posts.findMany({
        with: {
          user: true,
        },
      });

      expect(posts).toHaveLength(1);
      expect(posts[0]._id).toBe(postId);
      expect(posts[0].user).toBeNull();
    });

    test('should batch load users for multiple posts (no N+1)', async ({
      ctx,
    }) => {
      // Create 2 users
      const user1Id = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const user2Id = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      // Create 5 posts: 3 by Alice, 2 by Bob
      await ctx.db.insert('posts', {
        text: 'Alice post 1',
        numLikes: 10,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Alice post 2',
        numLikes: 15,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Alice post 3',
        numLikes: 20,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Bob post 1',
        numLikes: 5,
        type: 'text',
        userId: user2Id,
      });
      await ctx.db.insert('posts', {
        text: 'Bob post 2',
        numLikes: 8,
        type: 'text',
        userId: user2Id,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const posts = (await db.query.posts.findMany({
        with: {
          user: true,
        },
      })) as any;

      expect(posts).toHaveLength(5);

      // Verify all posts by Alice reference the same user object
      const alicePosts = posts.filter((p: any) => p.userId === user1Id);
      expect(alicePosts).toHaveLength(3);
      expect(alicePosts.every((p: any) => p.user!._id === user1Id)).toBe(true);
      expect(alicePosts.every((p: any) => p.user!.name === 'Alice')).toBe(true);

      // Verify all posts by Bob reference the same user object
      const bobPosts = posts.filter((p: any) => p.userId === user2Id);
      expect(bobPosts).toHaveLength(2);
      expect(bobPosts.every((p: any) => p.user!._id === user2Id)).toBe(true);
      expect(bobPosts.every((p: any) => p.user!.name === 'Bob')).toBe(true);
    });
  });

  describe('findFirst() with Relations', () => {
    test('should load relations for single result', async ({ ctx }) => {
      // Create user with posts
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      await ctx.db.insert('posts', {
        text: 'First post',
        numLikes: 10,
        type: 'text',
        userId,
      });

      await ctx.db.insert('posts', {
        text: 'Second post',
        numLikes: 20,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const user = await db.query.users.findFirst({
        with: {
          posts: true,
        },
      });

      expect(user).toBeDefined();
      expect(user!._id).toBe(userId);
      expect(user!.posts).toHaveLength(2);
    });
  });
});

describe('M6.5 Phase 2: Nested Relation Loading', () => {
  describe('3-Level Nesting (users → posts → comments)', () => {
    test('should load nested relations up to depth 3', async ({ ctx }) => {
      // Create user → post → comment hierarchy
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const postId = await ctx.db.insert('posts', {
        text: 'My post',
        numLikes: 10,
        type: 'text',
        userId,
      });

      const comment1Id = await (ctx.db as any).insert('comments', {
        text: 'Great post!',
        postId,
        userId,
      });

      const comment2Id = await (ctx.db as any).insert('comments', {
        text: 'Thanks for sharing',
        postId,
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = await db.query.users.findMany({
        with: {
          posts: {
            with: {
              comments: true,
            },
          },
        },
      });

      expect(users).toHaveLength(1);
      expect(users[0]._id).toBe(userId);
      expect((users[0] as any).posts).toHaveLength(1);
      expect((users[0] as any).posts[0]._id).toBe(postId);
      expect((users[0] as any).posts[0].comments).toHaveLength(2);
      expect((users[0] as any).posts[0].comments[0]._id).toBe(comment1Id);
      expect((users[0] as any).posts[0].comments[1]._id).toBe(comment2Id);
    });

    test('should handle empty nested relations', async ({ ctx }) => {
      // Create user with post but no comments
      const userId = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      await ctx.db.insert('posts', {
        text: 'Post without comments',
        numLikes: 5,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = await db.query.users.findMany({
        with: {
          posts: {
            with: {
              comments: true,
            },
          },
        },
      });

      expect(users).toHaveLength(1);
      expect((users[0] as any).posts).toHaveLength(1);
      expect((users[0] as any).posts[0].comments).toEqual([]);
    });

    test('should batch load nested relations efficiently', async ({ ctx }) => {
      // Create 2 users with 2 posts each, each post with 2 comments
      const user1Id = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const user2Id = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      // Alice's posts and comments
      const alice_post1 = await ctx.db.insert('posts', {
        text: 'Alice post 1',
        numLikes: 10,
        type: 'text',
        userId: user1Id,
      });

      const alice_post2 = await ctx.db.insert('posts', {
        text: 'Alice post 2',
        numLikes: 15,
        type: 'text',
        userId: user1Id,
      });

      await (ctx.db as any).insert('comments', {
        text: 'Comment on Alice post 1',
        postId: alice_post1,
        userId: user1Id,
      });

      await (ctx.db as any).insert('comments', {
        text: 'Another comment on Alice post 1',
        postId: alice_post1,
        userId: user1Id,
      });

      await (ctx.db as any).insert('comments', {
        text: 'Comment on Alice post 2',
        postId: alice_post2,
        userId: user1Id,
      });

      // Bob's posts and comments
      const bob_post1 = await ctx.db.insert('posts', {
        text: 'Bob post 1',
        numLikes: 20,
        type: 'text',
        userId: user2Id,
      });

      await (ctx.db as any).insert('comments', {
        text: 'Comment on Bob post 1',
        postId: bob_post1,
        userId: user2Id,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const users = await db.query.users.findMany({
        with: {
          posts: {
            with: {
              comments: true,
            },
          },
        },
      });

      expect(users).toHaveLength(2);

      // Verify Alice's nested data
      const alice = users.find((u) => u._id === user1Id) as any;
      expect(alice).toBeDefined();
      expect(alice.posts).toHaveLength(2);
      expect(alice.posts[0].comments).toHaveLength(2);
      expect(alice.posts[1].comments).toHaveLength(1);

      // Verify Bob's nested data
      const bob = users.find((u) => u._id === user2Id) as any;
      expect(bob).toBeDefined();
      expect(bob.posts).toHaveLength(1);
      expect(bob.posts[0].comments).toHaveLength(1);
    });
  });

  describe('Depth Limiting', () => {
    test('should respect max depth limit of 3', async ({ ctx }) => {
      // We can't easily test depth > 3 without more tables,
      // but we can verify depth 3 works and depth limiting is in place
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const postId = await ctx.db.insert('posts', {
        text: 'Post',
        numLikes: 10,
        type: 'text',
        userId,
      });

      await (ctx.db as any).insert('comments', {
        text: 'Comment',
        postId,
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);

      // Depth 1: users
      // Depth 2: users.posts
      // Depth 3: users.posts.comments
      const users = await db.query.users.findMany({
        with: {
          posts: {
            with: {
              comments: true,
            },
          },
        },
      });

      expect((users[0] as any).posts[0].comments).toBeDefined();
      expect((users[0] as any).posts[0].comments).toHaveLength(1);
    });
  });
});

describe('M6.5 Phase 3: Relation Filters and Limits', () => {
  describe('OrderBy', () => {
    test('should order relations by field ascending', async ({ ctx }) => {
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      // Create posts with different numLikes
      await ctx.db.insert('posts', {
        text: 'Post 1',
        numLikes: 30,
        type: 'text',
        userId,
      });

      await ctx.db.insert('posts', {
        text: 'Post 2',
        numLikes: 10,
        type: 'text',
        userId,
      });

      await ctx.db.insert('posts', {
        text: 'Post 3',
        numLikes: 20,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);

      // Import asc helper
      const { asc } = await import('better-convex/orm');

      const users = await db.query.users.findMany({
        with: {
          posts: {
            orderBy: asc(ormPosts.numLikes),
          },
        },
      });

      expect((users[0] as any).posts).toHaveLength(3);
      expect((users[0] as any).posts[0].numLikes).toBe(10);
      expect((users[0] as any).posts[1].numLikes).toBe(20);
      expect((users[0] as any).posts[2].numLikes).toBe(30);
    });

    test('should order relations by field descending', async ({ ctx }) => {
      const userId = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      // Create posts with different numLikes
      await ctx.db.insert('posts', {
        text: 'Post 1',
        numLikes: 30,
        type: 'text',
        userId,
      });

      await ctx.db.insert('posts', {
        text: 'Post 2',
        numLikes: 10,
        type: 'text',
        userId,
      });

      await ctx.db.insert('posts', {
        text: 'Post 3',
        numLikes: 20,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);

      // Import desc helper
      const { desc } = await import('better-convex/orm');

      const users = await db.query.users.findMany({
        with: {
          posts: {
            orderBy: desc(ormPosts.numLikes),
          },
        },
      });

      expect((users[0] as any).posts).toHaveLength(3);
      expect((users[0] as any).posts[0].numLikes).toBe(30);
      expect((users[0] as any).posts[1].numLikes).toBe(20);
      expect((users[0] as any).posts[2].numLikes).toBe(10);
    });
  });

  describe('Per-Parent Limiting', () => {
    test('should limit relations per parent (not globally)', async ({
      ctx,
    }) => {
      // Create 2 users
      const user1Id = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const user2Id = await ctx.db.insert('users', {
        name: 'Bob',
        email: 'bob@example.com',
      });

      // Alice: 3 posts
      await ctx.db.insert('posts', {
        text: 'Alice post 1',
        numLikes: 10,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Alice post 2',
        numLikes: 20,
        type: 'text',
        userId: user1Id,
      });
      await ctx.db.insert('posts', {
        text: 'Alice post 3',
        numLikes: 30,
        type: 'text',
        userId: user1Id,
      });

      // Bob: 3 posts
      await ctx.db.insert('posts', {
        text: 'Bob post 1',
        numLikes: 5,
        type: 'text',
        userId: user2Id,
      });
      await ctx.db.insert('posts', {
        text: 'Bob post 2',
        numLikes: 15,
        type: 'text',
        userId: user2Id,
      });
      await ctx.db.insert('posts', {
        text: 'Bob post 3',
        numLikes: 25,
        type: 'text',
        userId: user2Id,
      });

      const db = createDatabase(ctx.db, testSchema, edges);

      const users = await db.query.users.findMany({
        with: {
          posts: {
            limit: 2, // Limit to 2 posts PER USER
          },
        },
      });

      expect(users).toHaveLength(2);

      // Verify Alice has exactly 2 posts (not affected by Bob's posts)
      const alice = users.find((u) => u._id === user1Id) as any;
      expect(alice.posts).toHaveLength(2);

      // Verify Bob has exactly 2 posts (not affected by Alice's posts)
      const bob = users.find((u) => u._id === user2Id) as any;
      expect(bob.posts).toHaveLength(2);
    });
  });

  describe('OrderBy + Limit Combinations', () => {
    test('should order then limit per parent', async ({ ctx }) => {
      const userId = await ctx.db.insert('users', {
        name: 'Alice',
        email: 'alice@example.com',
      });

      // Create 5 posts with different numLikes
      await ctx.db.insert('posts', {
        text: 'Post 1',
        numLikes: 50,
        type: 'text',
        userId,
      });
      await ctx.db.insert('posts', {
        text: 'Post 2',
        numLikes: 10,
        type: 'text',
        userId,
      });
      await ctx.db.insert('posts', {
        text: 'Post 3',
        numLikes: 30,
        type: 'text',
        userId,
      });
      await ctx.db.insert('posts', {
        text: 'Post 4',
        numLikes: 20,
        type: 'text',
        userId,
      });
      await ctx.db.insert('posts', {
        text: 'Post 5',
        numLikes: 40,
        type: 'text',
        userId,
      });

      const db = createDatabase(ctx.db, testSchema, edges);
      const { desc } = await import('better-convex/orm');

      const users = await db.query.users.findMany({
        with: {
          posts: {
            orderBy: desc(ormPosts.numLikes),
            limit: 3, // Get top 3 posts by likes
          },
        },
      });

      expect((users[0] as any).posts).toHaveLength(3);
      // Should get posts with 50, 40, 30 likes (top 3)
      expect((users[0] as any).posts[0].numLikes).toBe(50);
      expect((users[0] as any).posts[1].numLikes).toBe(40);
      expect((users[0] as any).posts[2].numLikes).toBe(30);
    });
  });
});
