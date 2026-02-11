import { expect, test } from 'vitest';
import schema from '../schema';
import { convexTest, runCtx } from '../setup.testing';

function hasStringSlug(row: unknown): row is { slug: string } {
  if (typeof row !== 'object' || row === null) {
    return false;
  }

  const candidate = row as { slug?: unknown };
  return typeof candidate.slug === 'string';
}

function hasName(row: unknown): row is { name: string } {
  if (typeof row !== 'object' || row === null) {
    return false;
  }

  const candidate = row as { name?: unknown };
  return typeof candidate.name === 'string';
}

function hasStatus(row: unknown): row is { status: string } {
  if (typeof row !== 'object' || row === null) {
    return false;
  }

  const candidate = row as { status?: unknown };
  return typeof candidate.status === 'string';
}

function isExpandedFlatMapRow(
  row: unknown
): row is { parent?: { name?: string }; child: { text: string } } {
  if (typeof row !== 'object' || row === null) {
    return false;
  }

  const candidate = row as {
    parent?: { name?: unknown };
    child?: { text?: unknown };
  };

  const parentNameIsValid =
    candidate.parent === undefined ||
    candidate.parent === null ||
    typeof candidate.parent.name === 'string';
  return parentNameIsValid && typeof candidate.child?.text === 'string';
}

test('findMany pipeline union can interleave indexed streams', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    await baseCtx.db.insert('users', {
      name: 'Aaron',
      email: 'aaron@example.com',
      status: 'active',
    });
    await baseCtx.db.insert('users', {
      name: 'Bella',
      email: 'bella@example.com',
      status: 'pending',
    });
    await baseCtx.db.insert('users', {
      name: 'Chris',
      email: 'chris@example.com',
      status: 'active',
    });
    await baseCtx.db.insert('users', {
      name: 'Diana',
      email: 'diana@example.com',
      status: 'pending',
    });
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const result = await ctx.orm.query.users.findMany({
      cursor: null,
      limit: 10,
      pipeline: {
        union: [
          {
            index: {
              name: 'by_name',
            },
            where: { status: 'active' },
          },
          {
            index: {
              name: 'by_name',
            },
            where: { status: 'pending' },
          },
        ],
        interleaveBy: ['name'],
      },
    } as any);

    const namedRows = result.page.filter(hasName);

    expect(namedRows).toHaveLength(4);
    expect(namedRows.map((u) => u.name)).toEqual([
      'Aaron',
      'Bella',
      'Chris',
      'Diana',
    ]);
  });
});

test('findMany pipeline map/filterWith runs before pagination and supports maxScan metadata', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    for (let i = 0; i < 20; i++) {
      await baseCtx.db.insert('users', {
        name: `User ${String(i).padStart(2, '0')}`,
        email: `pipeline-${i}@example.com`,
      });
    }
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const result = await ctx.orm.query.users.findMany({
      cursor: null,
      limit: 5,
      maxScan: 2,
      pipeline: {
        stages: [
          {
            filterWith: async (row: { name: string }) => row.name.endsWith('0'),
          },
          {
            map: async (row: { name: string }) => ({
              ...row,
              slug: row.name.toLowerCase(),
            }),
          },
        ],
      },
    } as any);

    const namedRows = result.page.filter(hasName);

    expect(namedRows).toHaveLength(result.page.length);
    expect(namedRows.every((u) => u.name.endsWith('0'))).toBe(true);
    expect(result.page.every(hasStringSlug)).toBe(true);
    const streamMetadata = result as {
      pageStatus?: unknown;
      splitCursor?: unknown;
    };
    expect(streamMetadata.pageStatus).toBeDefined();
    expect(streamMetadata.splitCursor).toBeDefined();
  });
});

test('findMany pipeline distinct supports pagination', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    await baseCtx.db.insert('users', {
      name: 'A',
      email: 'a@example.com',
      status: 'active',
    });
    await baseCtx.db.insert('users', {
      name: 'B',
      email: 'b@example.com',
      status: 'active',
    });
    await baseCtx.db.insert('users', {
      name: 'C',
      email: 'c@example.com',
      status: 'pending',
    });
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const result = await ctx.orm.query.users.findMany({
      cursor: null,
      limit: 10,
      pipeline: {
        stages: [{ distinct: { fields: ['status'] } }],
      },
      orderBy: { status: 'asc' },
    } as any);

    const statusRows = result.page.filter(hasStatus);

    expect(statusRows).toHaveLength(2);
    expect(statusRows.map((u) => u.status)).toEqual(['active', 'pending']);
  });
});

test('findMany pipeline flatMap supports relation-targeted expansion (includeParent)', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    const user1 = await baseCtx.db.insert('users', {
      name: 'Alice',
      email: 'alice@example.com',
    });
    const user2 = await baseCtx.db.insert('users', {
      name: 'Bob',
      email: 'bob@example.com',
    });

    await baseCtx.db.insert('posts', {
      text: 'hello',
      numLikes: 1,
      type: 'note',
      authorId: user1,
    });
    await baseCtx.db.insert('posts', {
      text: 'world',
      numLikes: 2,
      type: 'note',
      authorId: user1,
    });
    await baseCtx.db.insert('posts', {
      text: 'skip',
      numLikes: 3,
      type: 'note',
      authorId: user2,
    });
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const result = await ctx.orm.query.users.findMany({
      where: { name: 'Alice' },
      cursor: null,
      limit: 10,
      pipeline: {
        stages: [
          {
            flatMap: {
              relation: 'posts',
              includeParent: true,
            },
          },
        ],
      },
    } as any);

    const expandedRows = result.page.filter(isExpandedFlatMapRow);

    expect(expandedRows).toHaveLength(2);
    expect(expandedRows.every((row) => row.parent?.name === 'Alice')).toBe(
      true
    );
    expect(expandedRows.map((row) => row.child.text)).toEqual([
      'hello',
      'world',
    ]);
  });
});

test('findMany cursor mode supports endCursor boundary pinning', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    await baseCtx.db.insert('users', {
      name: 'A',
      email: 'a@boundary.example.com',
    });
    await baseCtx.db.insert('users', {
      name: 'B',
      email: 'b@boundary.example.com',
    });
    await baseCtx.db.insert('users', {
      name: 'C',
      email: 'c@boundary.example.com',
    });
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);

    const first = await ctx.orm.query.users.findMany({
      orderBy: { name: 'asc' },
      cursor: null,
      limit: 2,
      pipeline: { stages: [] },
    } as any);

    await baseCtx.db.insert('users', {
      name: 'AB',
      email: 'ab@boundary.example.com',
    });

    const refreshed = await ctx.orm.query.users.findMany({
      orderBy: { name: 'asc' },
      cursor: null,
      endCursor: first.continueCursor,
      limit: 2,
      pipeline: { stages: [] },
    } as any);

    const refreshedNamedRows = refreshed.page.filter(hasName);

    expect(refreshedNamedRows).toHaveLength(3);
    expect(refreshedNamedRows.map((u) => u.name)).toEqual(['A', 'AB', 'B']);
    expect(refreshed.continueCursor).toBe(first.continueCursor);
  });
});

test('findMany pageByKey returns page, indexKeys and hasMore', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    await baseCtx.db.insert('users', {
      name: 'A',
      email: 'a@key.example.com',
    });
    await baseCtx.db.insert('users', {
      name: 'B',
      email: 'b@key.example.com',
    });
    await baseCtx.db.insert('users', {
      name: 'C',
      email: 'c@key.example.com',
    });
  });

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);
    const first = await ctx.orm.query.users.findMany({
      pageByKey: {
        index: 'by_name',
        targetMaxRows: 2,
      },
    } as any);

    expect(first.page).toHaveLength(2);
    const keyPage = first as unknown as {
      indexKeys: unknown[];
      hasMore: boolean;
    };
    expect(keyPage.indexKeys).toHaveLength(2);
    expect(keyPage.hasMore).toBe(true);
  });
});

test('findMany advanced pipeline rejects unsupported combinations', async () => {
  const t = convexTest(schema);

  await t.run(async (baseCtx) => {
    const ctx = await runCtx(baseCtx);

    await expect(() =>
      ctx.orm.query.posts.findMany({
        search: { index: 'text_search', query: 'hello' },
        pipeline: { stages: [] },
      } as any)
    ).rejects.toThrow(/pipeline.*search/i);

    await expect(() =>
      ctx.orm.query.posts.findMany({
        vectorSearch: {
          index: 'embedding_vec',
          vector: Array.from({ length: 1536 }, () => 0),
          limit: 5,
        },
        pipeline: { stages: [] },
      } as any)
    ).rejects.toThrow(/pipeline.*vector/i);

    await expect(() =>
      ctx.orm.query.users.findMany({
        // @ts-expect-error - endCursor requires cursor pagination.
        endCursor: '[]',
        limit: 1,
      })
    ).rejects.toThrow(/endCursor.*cursor/i);

    await expect(() =>
      ctx.orm.query.users.findMany({
        cursor: null,
        limit: 1,
        pipeline: {
          stages: [
            {
              flatMap: {
                relation: 'doesNotExist',
              },
            },
          ],
        },
      } as any)
    ).rejects.toThrow(/relation/i);
  });
});
