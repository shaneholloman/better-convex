/**
 * M5 String Operators - Comprehensive Test Suite
 *
 * Tests string matching operators:
 * - like() with % wildcards
 * - ilike() case-insensitive
 * - startsWith() prefix matching
 * - endsWith() suffix matching
 * - contains() substring matching
 */

import { createDatabase, extractRelationsConfig } from 'better-convex/orm';
import { test as baseTest, describe, expect } from 'vitest';
import schema, {
  ormPosts,
  ormPostsRelations,
  ormSchema,
  ormUsers,
  ormUsersRelations,
} from '../schema';
import { convexTest } from '../setup.testing';

// ============================================================================
// Test Setup
// ============================================================================

const test = baseTest.extend<{ ctx: any }>({
  ctx: async ({}, use) => {
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await use(ctx);
    });
  },
});

// Extract edges once for all tests
const testSchema = ormSchema;
const edges = extractRelationsConfig({
  users: ormUsers,
  posts: ormPosts,
  usersRelations: ormUsersRelations,
  postsRelations: ormPostsRelations,
});

// ============================================================================
// LIKE Operator Tests
// ============================================================================

describe('M5: like() operator', () => {
  test('like with %prefix% pattern matches substring', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Python Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Advanced JavaScript',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts with 'JavaScript' in title
    const posts = await db.query.posts.findMany({
      where: (cols, { like }) => like(cols.title, '%JavaScript%'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('JavaScript Guide');
    expect(posts.map((p) => p.title)).toContain('Advanced JavaScript');
  });

  test('like with prefix% pattern matches prefix', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Python Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Java Basics',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts starting with 'Java'
    const posts = await db.query.posts.findMany({
      where: (cols, { like }) => like(cols.title, 'Java%'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('JavaScript Guide');
    expect(posts.map((p) => p.title)).toContain('Java Basics');
  });

  test('like with %suffix pattern matches suffix', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Beginner Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Advanced Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Quick Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts ending with 'Guide'
    const posts = await db.query.posts.findMany({
      where: (cols, { like }) => like(cols.title, '%Guide'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('Beginner Guide');
    expect(posts.map((p) => p.title)).toContain('Quick Guide');
  });

  test('like without wildcards matches exact', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Exact Title',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Exact',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });

    // Find exact match
    const posts = await db.query.posts.findMany({
      where: (cols, { like }) => like(cols.title, 'Exact Title'),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Exact Title');
  });
});

// ============================================================================
// ILIKE Operator Tests (Case-Insensitive)
// ============================================================================

describe('M5: ilike() operator', () => {
  test('ilike is case-insensitive', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JAVASCRIPT Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Python Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'javascript basics',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts with 'javascript' (any case)
    const posts = await db.query.posts.findMany({
      where: (cols, { ilike }) => ilike(cols.title, '%javascript%'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('JAVASCRIPT Guide');
    expect(posts.map((p) => p.title)).toContain('javascript basics');
  });
});

// ============================================================================
// startsWith Operator Tests
// ============================================================================

describe('M5: startsWith() operator', () => {
  test('startsWith matches prefix', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Python Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Java Basics',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts starting with 'Java'
    const posts = await db.query.posts.findMany({
      where: (cols, { startsWith }) => startsWith(cols.title, 'Java'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('JavaScript Guide');
    expect(posts.map((p) => p.title)).toContain('Java Basics');
  });

  test('startsWith is case-sensitive', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'javascript basics',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });

    // Find posts starting with 'Java' (case-sensitive)
    const posts = await db.query.posts.findMany({
      where: (cols, { startsWith }) => startsWith(cols.title, 'Java'),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('JavaScript Guide');
  });
});

// ============================================================================
// endsWith Operator Tests
// ============================================================================

describe('M5: endsWith() operator', () => {
  test('endsWith matches suffix', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Beginner Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Advanced Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Quick Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts ending with 'Guide'
    const posts = await db.query.posts.findMany({
      where: (cols, { endsWith }) => endsWith(cols.title, 'Guide'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('Beginner Guide');
    expect(posts.map((p) => p.title)).toContain('Quick Guide');
  });

  test('endsWith is case-sensitive', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Quick Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Quick guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });

    // Find posts ending with 'Guide' (case-sensitive)
    const posts = await db.query.posts.findMany({
      where: (cols, { endsWith }) => endsWith(cols.title, 'Guide'),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('Quick Guide');
  });
});

// ============================================================================
// contains Operator Tests
// ============================================================================

describe('M5: contains() operator', () => {
  test('contains matches substring', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Python Tutorial',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'Advanced JavaScript',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 3000,
    });

    // Find posts containing 'JavaScript'
    const posts = await db.query.posts.findMany({
      where: (cols, { contains }) => contains(cols.title, 'JavaScript'),
    });

    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.title)).toContain('JavaScript Guide');
    expect(posts.map((p) => p.title)).toContain('Advanced JavaScript');
  });

  test('contains is case-sensitive', async ({ ctx }) => {
    const db = createDatabase(ctx.db, testSchema, edges);

    const user = await ctx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });

    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'JavaScript Guide',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 1000,
    });
    await ctx.db.insert('posts', {
      text: 'test',
      numLikes: 0,
      type: 'text',
      title: 'javascript basics',
      content: 'Content',
      published: true,
      userId: user,
      createdAt: 2000,
    });

    // Find posts containing 'JavaScript' (case-sensitive)
    const posts = await db.query.posts.findMany({
      where: (cols, { contains }) => contains(cols.title, 'JavaScript'),
    });

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe('JavaScript Guide');
  });
});
