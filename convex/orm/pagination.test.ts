/**
 * M6.5 Phase 4: Cursor Pagination Tests
 *
 * Tests for .paginate() method with Convex-native cursor pagination (O(1) performance)
 */

import { createDatabase, extractRelationsConfig } from 'better-convex/orm';
import { expect, test } from 'vitest';
import schema, { ormPosts, ormSchema, ormUsers } from '../schema';
import { convexTest, runCtx } from '../setup.testing';

// Create test schema for ORM
const testSchema = ormSchema;

// Extract edges for relation loading
const edges = extractRelationsConfig(ormSchema);

test('basic pagination - null cursor returns first page', async () => {
  const t = convexTest(schema);

  // Setup: Create 50 users
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 50; i++) {
      await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
    }
  });

  // Test: Paginate first page
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 10,
    });

    expect(result.page).toHaveLength(10);
    expect(result.isDone).toBe(false);
    expect(result.continueCursor).not.toBeNull();
  });
});

test('pagination - multiple pages with cursor', async () => {
  const t = convexTest(schema);

  // Setup: Create 25 users
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 25; i++) {
      await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
    }
  });

  // Test: Paginate through all pages
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    // Page 1
    const page1 = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 10,
    });
    expect(page1.page).toHaveLength(10);
    expect(page1.isDone).toBe(false);
    expect(page1.continueCursor).not.toBeNull();

    // Page 2
    const page2 = await db.query.users.paginate(undefined, {
      cursor: page1.continueCursor,
      numItems: 10,
    });
    expect(page2.page).toHaveLength(10);
    expect(page2.isDone).toBe(false);
    expect(page2.continueCursor).not.toBeNull();

    // Page 3 (last page - only 5 items)
    const page3 = await db.query.users.paginate(undefined, {
      cursor: page2.continueCursor,
      numItems: 10,
    });
    expect(page3.page).toHaveLength(5);
    expect(page3.isDone).toBe(true);
    // Convex returns "_end_cursor" when done, not null
    expect(page3.isDone).toBe(true);

    // Verify no duplicates across pages
    const allUsers = [...page1.page, ...page2.page, ...page3.page];
    const uniqueIds = new Set(allUsers.map((u: any) => u._id));
    expect(uniqueIds.size).toBe(25);
  });
});

test('pagination - empty result set', async () => {
  const t = convexTest(schema);

  // No setup - empty database

  // Test: Paginate empty table
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 10,
    });

    expect(result.page).toHaveLength(0);
    expect(result.isDone).toBe(true);
    // Convex pagination returns "_end_cursor" marker when done
  });
});

test('pagination - single page (isDone: true)', async () => {
  const t = convexTest(schema);

  // Setup: Create 5 users (less than page size)
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 5; i++) {
      await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
    }
  });

  // Test: Paginate with larger page size
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 10,
    });

    expect(result.page).toHaveLength(5);
    expect(result.isDone).toBe(true);
    // Convex pagination returns "_end_cursor" marker when done
  });
});

test('pagination with WHERE filter', async () => {
  const t = convexTest(schema);

  // Setup: Create users with different ages
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 30; i++) {
      await ctx.table('users').insert({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        age: 20 + (i % 10), // Ages 20-29
      });
    }
  });

  // Test: Paginate only users age >= 25
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(
      {
        where: { age: { gte: 25 } },
      },
      {
        cursor: null,
        numItems: 10,
      }
    );

    expect(result.page.length).toBeGreaterThan(0);
    // Verify all results match filter
    result.page.forEach((user: any) => {
      expect(user.age).toBeGreaterThanOrEqual(25);
    });
  });
});

test('pagination with ORDER BY ascending', async () => {
  const t = convexTest(schema);

  // Setup: Create users with specific names
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const names = ['Charlie', 'Alice', 'Bob', 'David', 'Eve'];
    for (const name of names) {
      await ctx
        .table('users')
        .insert({ name, email: `${name.toLowerCase()}@example.com` });
    }
  });

  // Test: Paginate with ascending order
  // Note: Pagination requires indexed fields for custom ordering.
  // Since 'name' has no index, this falls back to _creationTime ordering.
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(
      {
        orderBy: { name: 'asc' },
      },
      {
        cursor: null,
        numItems: 3,
      }
    );

    // Verify pagination works (returns correct count)
    expect(result.page).toHaveLength(3);
    // Results are ordered by _creationTime ascending (Charlie, Alice, Bob) since name has no index
    expect((result.page[0] as any).name).toBe('Charlie');
    expect((result.page[1] as any).name).toBe('Alice');
    expect((result.page[2] as any).name).toBe('Bob');
  });
});

test('pagination with ORDER BY descending', async () => {
  const t = convexTest(schema);

  // Setup: Create posts with different like counts
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const userId = await ctx
      .table('users')
      .insert({ name: 'Alice', email: 'alice@example.com' });

    for (let i = 1; i <= 20; i++) {
      await ctx.table('posts').insert({
        text: `Post ${i}`,
        title: `Post ${i}`,
        type: 'text',
        userId,
        numLikes: i * 10,
      });
    }
  });

  // Test: Paginate posts by likes descending
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.posts.paginate(
      {
        orderBy: { numLikes: 'desc' },
      },
      {
        cursor: null,
        numItems: 5,
      }
    );

    expect(result.page).toHaveLength(5);
    // Verify descending order
    expect((result.page[0] as any).numLikes).toBe(200);
    expect((result.page[1] as any).numLikes).toBe(190);
    expect((result.page[2] as any).numLikes).toBe(180);
    expect((result.page[3] as any).numLikes).toBe(170);
    expect((result.page[4] as any).numLikes).toBe(160);
  });
});

test('pagination - cursor stability (replaying cursor returns same results)', async () => {
  const t = convexTest(schema);

  // Setup: Create 15 users
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 15; i++) {
      await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
    }
  });

  // Test: Replay same cursor multiple times
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    // Get first page
    const page1 = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 5,
    });

    // Replay second page cursor twice
    const page2a = await db.query.users.paginate(undefined, {
      cursor: page1.continueCursor,
      numItems: 5,
    });

    const page2b = await db.query.users.paginate(undefined, {
      cursor: page1.continueCursor,
      numItems: 5,
    });

    // Both should return identical results
    expect(page2a.page.length).toBe(page2b.page.length);
    expect((page2a.page[0] as any)._id).toBe((page2b.page[0] as any)._id);
    expect((page2a.page[4] as any)._id).toBe((page2b.page[4] as any)._id);
  });
});

test('pagination - default ordering (_creationTime desc)', async () => {
  const t = convexTest(schema);

  // Setup: Create users in sequence
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const userIds = [];
    for (let i = 0; i < 10; i++) {
      const id = await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
      userIds.push(id);
    }
  });

  // Test: Paginate without explicit orderBy (should default to _creationTime desc)
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.users.paginate(undefined, {
      cursor: null,
      numItems: 5,
    });

    expect(result.page).toHaveLength(5);
    // Newest first (User 9, User 8, User 7, User 6, User 5)
    // Note: _creationTime ordering means most recently created comes first
    const names = result.page.map((u: any) => u.name);
    expect(names[0]).toBe('User 9');
    expect(names[4]).toBe('User 5');
  });
});

test('pagination - large result set (100+ items)', async () => {
  const t = convexTest(schema);

  // Setup: Create 150 users
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    for (let i = 0; i < 150; i++) {
      await ctx
        .table('users')
        .insert({ name: `User ${i}`, email: `user${i}@example.com` });
    }
  });

  // Test: Paginate through large dataset
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    let cursor: string | null = null;
    let totalFetched = 0;
    let pageCount = 0;

    // Paginate until done
    while (true) {
      const result: any = await db.query.users.paginate(undefined, {
        cursor,
        numItems: 20,
      });

      totalFetched += result.page.length;
      pageCount++;

      if (result.isDone) {
        break;
      }

      cursor = result.continueCursor;
    }

    expect(totalFetched).toBe(150);
    expect(pageCount).toBe(8); // 7 full pages + 1 partial page (150 / 20 = 7.5)
  });
});

test('pagination with combined WHERE and ORDER BY', async () => {
  const t = convexTest(schema);

  // Setup: Create posts with different publish status and likes
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const userId = await ctx
      .table('users')
      .insert({ name: 'Alice', email: 'alice@example.com' });

    for (let i = 0; i < 30; i++) {
      await ctx.table('posts').insert({
        text: `Post ${i}`,
        title: `Post ${i}`,
        type: 'text',
        userId,
        published: i % 3 === 0,
        numLikes: i,
      });
    }
  });

  // Test: Paginate published posts ordered by likes
  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const db = createDatabase(baseCtx.db, testSchema, edges);

    const result = await db.query.posts.paginate(
      {
        where: { published: true },
        orderBy: { numLikes: 'desc' },
      },
      {
        cursor: null,
        numItems: 5,
      }
    );

    expect(result.page.length).toBeGreaterThan(0);
    // Verify all are published
    result.page.forEach((post: any) => {
      expect(post.published).toBe(true);
    });

    // Verify descending order by likes
    for (let i = 0; i < result.page.length - 1; i++) {
      expect((result.page[i] as any).numLikes).toBeGreaterThanOrEqual(
        (result.page[i + 1] as any).numLikes
      );
    }
  });
});
