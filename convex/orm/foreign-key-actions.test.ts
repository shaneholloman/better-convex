import {
  type CreateDatabaseOptions,
  convexTable,
  createDatabase,
  type DatabaseWithMutations,
  defineRelations,
  defineSchema,
  eq,
  extractRelationsConfig,
  foreignKey,
  id,
  index,
  number,
  text,
} from 'better-convex/orm';
import type {
  GenericDatabaseWriter,
  SchedulableFunctionReference,
} from 'convex/server';
import { describe, expect, it, vi } from 'vitest';
import { withTableCtx } from '../setup.testing';

const users = convexTable(
  'fk_action_users',
  {
    slug: text().notNull(),
    deletionTime: number(),
  },
  (t) => [index('by_slug').on(t.slug)]
);

const membershipsCascade = convexTable(
  'fk_action_memberships_cascade',
  {
    userId: id('fk_action_users').notNull(),
  },
  (t) => [
    index('by_user').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users._id] }).onDelete(
      'cascade'
    ),
  ]
);

const membershipsRestrict = convexTable(
  'fk_action_memberships_restrict',
  {
    userId: id('fk_action_users').notNull(),
  },
  (t) => [
    index('by_user').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users._id] }).onDelete(
      'restrict'
    ),
  ]
);

const membershipsSetNull = convexTable(
  'fk_action_memberships_null',
  {
    userId: id('fk_action_users'),
  },
  (t) => [
    index('by_user').on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users._id] }).onDelete(
      'set null'
    ),
  ]
);

const membershipsSetDefault = convexTable(
  'fk_action_memberships_default',
  {
    userSlug: text().default('unknown'),
  },
  (t) => [
    index('by_user_slug').on(t.userSlug),
    foreignKey({
      columns: [t.userSlug],
      foreignColumns: [users.slug],
    }).onDelete('set default'),
  ]
);

const membershipsUpdateCascade = convexTable(
  'fk_action_memberships_update_cascade',
  {
    userSlug: text().notNull(),
  },
  (t) => [
    index('by_user_slug').on(t.userSlug),
    foreignKey({
      columns: [t.userSlug],
      foreignColumns: [users.slug],
    }).onUpdate('cascade'),
  ]
);

const membershipsUpdateRestrict = convexTable(
  'fk_action_memberships_update_restrict',
  {
    userSlug: text().notNull(),
  },
  (t) => [
    index('by_user_slug').on(t.userSlug),
    foreignKey({
      columns: [t.userSlug],
      foreignColumns: [users.slug],
    }).onUpdate('restrict'),
  ]
);

const membershipsNoIndex = convexTable(
  'fk_action_memberships_no_index',
  {
    userId: id('fk_action_users').notNull(),
  },
  (t) => [
    foreignKey({ columns: [t.userId], foreignColumns: [users._id] }).onDelete(
      'cascade'
    ),
  ]
);

const baseSchemaTables = {
  fk_action_users: users,
  fk_action_memberships_cascade: membershipsCascade,
  fk_action_memberships_restrict: membershipsRestrict,
  fk_action_memberships_null: membershipsSetNull,
  fk_action_memberships_default: membershipsSetDefault,
  fk_action_memberships_update_cascade: membershipsUpdateCascade,
  fk_action_memberships_update_restrict: membershipsUpdateRestrict,
};

const createSchemaArtifacts = (
  options?: Parameters<typeof defineSchema>[1]
) => {
  const tables = { ...baseSchemaTables };
  const schema = defineSchema(tables, options);
  const relations = defineRelations(tables);
  const edges = extractRelationsConfig(relations);
  return { schema, relations, edges };
};

const { schema, relations, edges } = createSchemaArtifacts();
const {
  schema: cappedSchema,
  relations: cappedRelations,
  edges: cappedEdges,
} = createSchemaArtifacts({
  defaults: { mutationBatchSize: 1, mutationMaxRows: 2 },
});
const {
  schema: relaxedCapSchema,
  relations: relaxedCapRelations,
  edges: relaxedCapEdges,
} = createSchemaArtifacts({
  defaults: { mutationBatchSize: 1, mutationMaxRows: 5 },
});

const withCtx = async <T>(
  fn: (ctx: {
    table: DatabaseWithMutations<typeof relations>;
    db: GenericDatabaseWriter<any>;
  }) => Promise<T>,
  options?: CreateDatabaseOptions
) =>
  withTableCtx(
    schema,
    relations,
    edges,
    async ({ table, db }) => fn({ table, db }),
    options
  );

const withCappedCtx = async <T>(
  fn: (ctx: {
    table: DatabaseWithMutations<typeof cappedRelations>;
    db: GenericDatabaseWriter<any>;
  }) => Promise<T>,
  options?: CreateDatabaseOptions
) =>
  withTableCtx(
    cappedSchema,
    cappedRelations,
    cappedEdges,
    async ({ table, db }) => fn({ table, db }),
    options
  );

const withRelaxedCapCtx = async <T>(
  fn: (ctx: {
    table: DatabaseWithMutations<typeof relaxedCapRelations>;
    db: GenericDatabaseWriter<any>;
  }) => Promise<T>,
  options?: CreateDatabaseOptions
) =>
  withTableCtx(
    relaxedCapSchema,
    relaxedCapRelations,
    relaxedCapEdges,
    async ({ table, db }) => fn({ table, db }),
    options
  );

describe('foreign key actions', () => {
  it('cascades deletes', async () =>
    withCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      const [member] = await table
        .insert(membershipsCascade)
        .values({ userId: user._id })
        .returning();

      await table.delete(users).where(eq(users._id, user._id)).execute();

      expect(await db.get(member._id)).toBeNull();
    }));

  it('restricts deletes', async () =>
    withCtx(async ({ table }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table
        .insert(membershipsRestrict)
        .values({ userId: user._id })
        .returning();

      await expect(
        table.delete(users).where(eq(users._id, user._id)).execute()
      ).rejects.toThrow(/restrict/i);
    }));

  it('sets null on delete', async () =>
    withCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      const [member] = await table
        .insert(membershipsSetNull)
        .values({ userId: user._id })
        .returning();

      await table.delete(users).where(eq(users._id, user._id)).execute();

      const updated = await db.get(member._id);
      expect(updated?.userId ?? null).toBeNull();
    }));

  it('sets default on delete', async () =>
    withCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      const [member] = await table
        .insert(membershipsSetDefault)
        .values({ userSlug: 'ada' })
        .returning();

      await table.delete(users).where(eq(users._id, user._id)).execute();

      const updated = await db.get(member._id);
      expect(updated?.userSlug).toBe('unknown');
    }));

  it('cascades updates', async () =>
    withCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      const [member] = await table
        .insert(membershipsUpdateCascade)
        .values({ userSlug: 'ada' })
        .returning();

      await table
        .update(users)
        .set({ slug: 'ada-lovelace' })
        .where(eq(users._id, user._id))
        .execute();

      const updated = await db.get(member._id);
      expect(updated?.userSlug).toBe('ada-lovelace');
    }));

  it('restricts updates', async () =>
    withCtx(async ({ table }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table
        .insert(membershipsUpdateRestrict)
        .values({ userSlug: 'ada' })
        .returning();

      await expect(
        table
          .update(users)
          .set({ slug: 'ada-lovelace' })
          .where(eq(users._id, user._id))
          .execute()
      ).rejects.toThrow(/restrict/i);
    }));

  it('requires indexes for cascading actions', async () => {
    const schemaWithNoIndex = defineSchema({
      ...baseSchemaTables,
      fk_action_memberships_no_index: membershipsNoIndex,
    });
    const relationsWithNoIndex = defineRelations({
      ...baseSchemaTables,
      fk_action_memberships_no_index: membershipsNoIndex,
    });
    const edgesWithNoIndex = extractRelationsConfig(relationsWithNoIndex);

    await withTableCtx(
      schemaWithNoIndex,
      relationsWithNoIndex,
      edgesWithNoIndex,
      async ({ table }) => {
        const [user] = await table
          .insert(users)
          .values({ slug: 'ada' })
          .returning();

        await table
          .insert(membershipsNoIndex)
          .values({ userId: user._id })
          .returning();

        await expect(
          table.delete(users).where(eq(users._id, user._id)).execute()
        ).rejects.toThrow(/index/i);
      }
    );
  });

  it('fails fast when cascade delete exceeds mutationMaxRows', async () =>
    withCappedCtx(async ({ table }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table
        .insert(membershipsCascade)
        .values([
          { userId: user._id },
          { userId: user._id },
          { userId: user._id },
        ]);

      await expect(
        table.delete(users).where(eq(users._id, user._id)).execute()
      ).rejects.toThrow(/mutationMaxRows|matched more than|exceed/i);
    }));

  it('fails fast when cascade update exceeds mutationMaxRows', async () =>
    withCappedCtx(async ({ table }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table
        .insert(membershipsUpdateCascade)
        .values([
          { userSlug: 'ada' },
          { userSlug: 'ada' },
          { userSlug: 'ada' },
        ]);

      await expect(
        table
          .update(users)
          .set({ slug: 'ada-lovelace' })
          .where(eq(users._id, user._id))
          .execute()
      ).rejects.toThrow(/mutationMaxRows|matched more than|exceed/i);
    }));

  it('allows larger cascade fan-out when mutationMaxRows is increased', async () =>
    withRelaxedCapCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table
        .insert(membershipsCascade)
        .values([
          { userId: user._id },
          { userId: user._id },
          { userId: user._id },
        ]);

      await table.delete(users).where(eq(users._id, user._id)).execute();

      const remaining = await db
        .query('fk_action_memberships_cascade')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();
      expect(remaining).toHaveLength(0);
    }));
});

describe('soft and scheduled deletes', () => {
  it('soft deletes set deletionTime', async () =>
    withCtx(async ({ table, db }) => {
      const [user] = await table
        .insert(users)
        .values({ slug: 'ada' })
        .returning();

      await table.delete(users).where(eq(users._id, user._id)).soft().execute();

      const updated = await db.get(user._id);
      expect(updated?.deletionTime).toBeTypeOf('number');
    }));

  it('scheduled deletes enqueue a job', async () => {
    const scheduler = {
      runAfter: vi.fn(async () => 'scheduled' as any),
      runAt: vi.fn(async () => 'scheduled' as any),
      cancel: vi.fn(async () => undefined),
    };
    const scheduledDelete = {} as SchedulableFunctionReference;

    await withCtx(
      async ({ table }) => {
        const [user] = await table
          .insert(users)
          .values({ slug: 'ada' })
          .returning();

        await table
          .delete(users)
          .where(eq(users._id, user._id))
          .scheduled({ delayMs: 500 })
          .execute();

        expect(scheduler.runAfter).toHaveBeenCalledWith(500, scheduledDelete, {
          table: 'fk_action_users',
          id: user._id,
          cascadeMode: 'hard',
        });
      },
      { scheduler, scheduledDelete }
    );
  });
});
