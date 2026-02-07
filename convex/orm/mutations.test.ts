/**
 * M7 Mutations - Insert/Update/Delete Tests
 *
 * Tests Drizzle-style mutation builder API:
 * - insert().values().returning()
 * - update().set().where().returning()
 * - delete().where().returning()
 * - onConflictDoNothing/onConflictDoUpdate
 */

import {
  convexTable,
  defineRelations,
  defineSchema,
  eq,
  extractRelationsConfig,
  inArray,
  index,
  isNotNull,
  ne,
  notInArray,
  number,
  text,
} from 'better-convex/orm';
import { it as baseIt, describe, expect } from 'vitest';
import schema, { users } from '../schema';
import {
  convexTest,
  runCtx,
  type TestCtx,
  withTableCtx,
} from '../setup.testing';

const it = baseIt.extend<{ ctx: TestCtx }>({
  ctx: async ({}, use) => {
    const t = convexTest(schema);
    await t.run(async (baseCtx) => {
      const ctx = await runCtx(baseCtx);
      await use(ctx);
    });
  },
});

const baseUser = {
  name: 'Alice',
  email: 'alice@example.com',
  height: 1.8,
  age: 30,
  status: 'active',
  role: 'member',
  deletedAt: 0,
  cityId: null,
  homeCityId: null,
};

describe('M7 Mutations', () => {
  it('should insert and return full row', async ({ ctx }) => {
    const db = ctx.table;
    const [user] = await db.insert(users).values(baseUser).returning();

    expect(user).toBeDefined();
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user._id).toBeDefined();
  });

  it('should insert and return partial fields', async ({ ctx }) => {
    const db = ctx.table;
    const [user] = await db.insert(users).values(baseUser).returning({
      name: users.name,
      email: users.email,
    });

    expect(user).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
    });
  });

  it('should update rows and return updated values', async ({ ctx }) => {
    const db = ctx.table;
    const [user] = await db.insert(users).values(baseUser).returning();

    const [updated] = await db
      .update(users)
      .set({ name: 'Updated' })
      .where(eq(users._id, user._id))
      .returning();

    expect(updated.name).toBe('Updated');
  });

  it('should delete rows and return deleted values', async ({ ctx }) => {
    const db = ctx.table;
    const [user] = await db.insert(users).values(baseUser).returning();

    const deleted = await db
      .delete(users)
      .where(eq(users._id, user._id))
      .returning({
        name: users.name,
        email: users.email,
      });

    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toEqual({
      name: 'Alice',
      email: 'alice@example.com',
    });
    expect(await ctx.db.get(user._id)).toBeNull();
  });

  it('should skip insert on conflict do nothing', async ({ ctx }) => {
    const db = ctx.table;
    await db.insert(users).values(baseUser).returning();

    const result = await db
      .insert(users)
      .values({
        ...baseUser,
        name: 'Duplicate',
      })
      .onConflictDoNothing({ target: users.email })
      .returning();

    expect(result).toHaveLength(0);
  });

  it('should update existing row on conflict do update', async ({ ctx }) => {
    const db = ctx.table;
    await db.insert(users).values(baseUser).returning();

    const [updated] = await db
      .insert(users)
      .values({
        ...baseUser,
        name: 'Second',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: 'Updated' },
      })
      .returning();

    expect(updated.name).toBe('Updated');
  });

  it('should allow update/delete with indexed where without allowFullScan', async ({
    ctx,
  }) => {
    const db = ctx.table;
    await db.insert(users).values(baseUser).returning();

    const updated = await db
      .update(users)
      .set({ name: 'Indexed' })
      .where(eq(users.email, baseUser.email))
      .returning();

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Indexed');

    const deleted = await db
      .delete(users)
      .where(eq(users.email, baseUser.email))
      .returning();

    expect(deleted).toHaveLength(1);
  });

  it('should allow inArray update/delete with indexed where without allowFullScan', async ({
    ctx,
  }) => {
    const db = ctx.table;
    await db.insert(users).values([
      { ...baseUser, email: 'in-array-a@example.com', status: 'active' },
      { ...baseUser, email: 'in-array-b@example.com', status: 'pending' },
      { ...baseUser, email: 'in-array-c@example.com', status: 'inactive' },
    ]);

    const updated = await db
      .update(users)
      .set({ role: 'targeted' })
      .where(inArray(users.status, ['active', 'pending']))
      .returning({
        email: users.email,
        role: users.role,
        status: users.status,
      });

    expect(updated).toHaveLength(2);
    expect(updated.every((row) => row.role === 'targeted')).toBe(true);

    const deleted = await db
      .delete(users)
      .where(inArray(users.status, ['active', 'pending']))
      .returning({ status: users.status });

    expect(deleted).toHaveLength(2);
    expect(deleted.every((row) => row.status !== 'inactive')).toBe(true);
  });

  it('should allow ne/notInArray/isNotNull update/delete without allowFullScan when indexed', async ({
    ctx,
  }) => {
    const db = ctx.table;
    await db.insert(users).values([
      {
        ...baseUser,
        email: 'operator-a@example.com',
        status: 'active',
        deletedAt: null,
      },
      {
        ...baseUser,
        email: 'operator-b@example.com',
        status: 'pending',
        deletedAt: 100,
      },
      {
        ...baseUser,
        email: 'operator-c@example.com',
        status: 'deleted',
        deletedAt: 200,
      },
    ]);

    const neUpdated = await db
      .update(users)
      .set({ role: 'kept' })
      .where(ne(users.status, 'deleted'))
      .returning({
        email: users.email,
        status: users.status,
        role: users.role,
      });

    expect(neUpdated).toHaveLength(2);
    expect(neUpdated.every((row) => row.status !== 'deleted')).toBe(true);

    const notInUpdated = await db
      .update(users)
      .set({ role: 'non-deleted' })
      .where(notInArray(users.status, ['deleted']))
      .returning({
        email: users.email,
        status: users.status,
        role: users.role,
      });

    expect(notInUpdated).toHaveLength(2);
    expect(notInUpdated.every((row) => row.status !== 'deleted')).toBe(true);

    const isNotNullDeleted = await db
      .delete(users)
      .where(isNotNull(users.deletedAt))
      .returning({ email: users.email, deletedAt: users.deletedAt });

    expect(isNotNullDeleted).toHaveLength(2);
    expect(isNotNullDeleted.every((row) => row.deletedAt !== null)).toBe(true);
  });

  it('should throw update/delete without where when strict is true', async ({
    ctx,
  }) => {
    const db = ctx.table;
    await db.insert(users).values(baseUser).returning();

    await expect(db.update(users).set({ name: 'NoWhere' })).rejects.toThrow(
      /allowFullScan/i
    );
    await expect(db.delete(users)).rejects.toThrow(/allowFullScan/i);
  });

  it('should require allowFullScan for update/delete without where', async () => {
    const relaxedUsers = convexTable('relaxedUsers', {
      name: text().notNull(),
    });
    const tables = { relaxedUsers };
    const relaxedSchema = defineSchema(tables, { strict: false });
    const relaxedRelations = defineRelations(tables);
    const relaxedEdges = extractRelationsConfig(relaxedRelations);

    const warn = console.warn;
    console.warn = () => {};
    try {
      await expect(
        withTableCtx(
          relaxedSchema,
          relaxedRelations,
          relaxedEdges,
          async (ctx) => {
            await ctx.db.insert('relaxedUsers', { name: 'Alice' });
            await ctx.table.update(relaxedUsers).set({ name: 'Bob' });
          }
        )
      ).rejects.toThrow(/allowFullScan/i);

      await expect(
        withTableCtx(
          relaxedSchema,
          relaxedRelations,
          relaxedEdges,
          async (ctx) => {
            await ctx.db.insert('relaxedUsers', { name: 'Alice' });
            await ctx.table
              .update(relaxedUsers)
              .set({ name: 'Bob' })
              .allowFullScan();
            await ctx.table.delete(relaxedUsers).allowFullScan();
          }
        )
      ).resolves.toBeUndefined();
    } finally {
      console.warn = warn;
    }
  });

  it('should fail fast when update exceeds mutationMaxRows', async () => {
    const cappedUsers = convexTable(
      'cappedUsers',
      {
        name: text().notNull(),
        status: text().notNull(),
      },
      (t) => [index('by_status').on(t.status)]
    );
    const tables = { cappedUsers };
    const cappedSchema = defineSchema(tables, {
      defaults: { mutationBatchSize: 1, mutationMaxRows: 2 },
    });
    const cappedRelations = defineRelations(tables);
    const cappedEdges = extractRelationsConfig(cappedRelations);

    await expect(
      withTableCtx(cappedSchema, cappedRelations, cappedEdges, async (ctx) => {
        await ctx.db.insert('cappedUsers', { name: 'A', status: 'draft' });
        await ctx.db.insert('cappedUsers', { name: 'B', status: 'draft' });
        await ctx.db.insert('cappedUsers', { name: 'C', status: 'draft' });

        await ctx.table
          .update(cappedUsers)
          .set({ name: 'updated' })
          .where(eq(cappedUsers.status, 'draft'))
          .returning();
      })
    ).rejects.toThrow(/mutationMaxRows|exceed/i);
  });

  it('should fail fast when delete exceeds mutationMaxRows', async () => {
    const cappedUsers = convexTable(
      'cappedUsers',
      {
        name: text().notNull(),
        status: text().notNull(),
      },
      (t) => [index('by_status').on(t.status)]
    );
    const tables = { cappedUsers };
    const cappedSchema = defineSchema(tables, {
      defaults: { mutationBatchSize: 1, mutationMaxRows: 2 },
    });
    const cappedRelations = defineRelations(tables);
    const cappedEdges = extractRelationsConfig(cappedRelations);

    await expect(
      withTableCtx(cappedSchema, cappedRelations, cappedEdges, async (ctx) => {
        await ctx.db.insert('cappedUsers', { name: 'A', status: 'draft' });
        await ctx.db.insert('cappedUsers', { name: 'B', status: 'draft' });
        await ctx.db.insert('cappedUsers', { name: 'C', status: 'draft' });

        await ctx.table
          .delete(cappedUsers)
          .where(eq(cappedUsers.status, 'draft'))
          .returning();
      })
    ).rejects.toThrow(/mutationMaxRows|exceed/i);
  });

  it('should paginate update execution for large workloads', async () => {
    const pagedUsers = convexTable(
      'pagedUsers',
      {
        name: text().notNull(),
        status: text().notNull(),
        role: text().notNull(),
      },
      (t) => [index('by_status').on(t.status)]
    );
    const tables = { pagedUsers };
    const pagedSchema = defineSchema(tables);
    const pagedRelations = defineRelations(tables);
    const pagedEdges = extractRelationsConfig(pagedRelations);

    await withTableCtx(pagedSchema, pagedRelations, pagedEdges, async (ctx) => {
      await ctx.db.insert('pagedUsers', {
        name: 'A',
        status: 'draft',
        role: 'member',
      });
      await ctx.db.insert('pagedUsers', {
        name: 'B',
        status: 'draft',
        role: 'member',
      });
      await ctx.db.insert('pagedUsers', {
        name: 'C',
        status: 'draft',
        role: 'member',
      });

      const page1 = await ctx.table
        .update(pagedUsers)
        .set({ role: 'editor' })
        .where(eq(pagedUsers.status, 'draft'))
        .returning({ name: pagedUsers.name, role: pagedUsers.role })
        .paginate({ cursor: null, numItems: 2 });

      expect(page1.page).toHaveLength(2);
      expect(page1.numAffected).toBe(2);
      expect(page1.isDone).toBe(false);

      const page2 = await ctx.table
        .update(pagedUsers)
        .set({ role: 'editor' })
        .where(eq(pagedUsers.status, 'draft'))
        .returning({ name: pagedUsers.name, role: pagedUsers.role })
        .paginate({ cursor: page1.continueCursor, numItems: 2 });

      expect(page2.page).toHaveLength(1);
      expect(page2.numAffected).toBe(1);
      expect(page2.isDone).toBe(true);

      const rows = await ctx.db
        .query('pagedUsers')
        .withIndex('by_status', (q) => q.eq('status', 'draft'))
        .collect();
      expect(rows).toHaveLength(3);
      expect(rows.every((row: any) => row.role === 'editor')).toBe(true);
    });
  });

  it('should paginate delete execution for large workloads', async () => {
    const pagedDeleteUsers = convexTable(
      'pagedDeleteUsers',
      {
        name: text().notNull(),
        status: text().notNull(),
        role: text().notNull(),
        deletionTime: number(),
      },
      (t) => [index('by_status').on(t.status)]
    );
    const tables = { pagedDeleteUsers };
    const pagedSchema = defineSchema(tables);
    const pagedRelations = defineRelations(tables);
    const pagedEdges = extractRelationsConfig(pagedRelations);

    await withTableCtx(pagedSchema, pagedRelations, pagedEdges, async (ctx) => {
      await ctx.db.insert('pagedDeleteUsers', {
        name: 'A',
        status: 'draft',
        role: 'member',
        deletionTime: null,
      });
      await ctx.db.insert('pagedDeleteUsers', {
        name: 'B',
        status: 'draft',
        role: 'member',
        deletionTime: null,
      });
      await ctx.db.insert('pagedDeleteUsers', {
        name: 'C',
        status: 'draft',
        role: 'member',
        deletionTime: null,
      });

      const page1 = await ctx.table
        .delete(pagedDeleteUsers)
        .soft()
        .where(eq(pagedDeleteUsers.status, 'draft'))
        .paginate({ cursor: null, numItems: 2 });

      expect(page1.numAffected).toBe(2);
      expect(page1.isDone).toBe(false);

      const page2 = await ctx.table
        .delete(pagedDeleteUsers)
        .soft()
        .where(eq(pagedDeleteUsers.status, 'draft'))
        .paginate({ cursor: page1.continueCursor, numItems: 2 });

      expect(page2.numAffected).toBe(1);
      expect(page2.isDone).toBe(true);

      const rows = await ctx.db
        .query('pagedDeleteUsers')
        .withIndex('by_status', (q) => q.eq('status', 'draft'))
        .collect();
      expect(rows).toHaveLength(3);
      expect(rows.every((row: any) => row.deletionTime !== null)).toBe(true);
    });
  });

  it('should reject paginated update/delete for multi-probe filters', async ({
    ctx,
  }) => {
    const db = ctx.table;
    await db.insert(users).values([
      { ...baseUser, email: 'probe-a@example.com', status: 'active' },
      { ...baseUser, email: 'probe-b@example.com', status: 'pending' },
    ]);

    await expect(
      db
        .update(users)
        .set({ role: 'updated' })
        .where(inArray(users.status, ['active', 'pending']))
        .paginate({ cursor: null, numItems: 10 })
    ).rejects.toThrow(/multi-probe/i);

    await expect(
      db
        .delete(users)
        .where(inArray(users.status, ['active', 'pending']))
        .paginate({ cursor: null, numItems: 10 })
    ).rejects.toThrow(/multi-probe/i);
  });
});
