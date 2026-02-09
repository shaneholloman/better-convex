import { internalMutationGeneric } from 'convex/server';
import { v } from 'convex/values';

import { createApi } from './create-api';

const schema = {
  tables: {
    user: {
      validator: {
        fields: {
          email: v.string(),
          name: v.optional(v.string()),
        },
      },
      export: () => ({ indexes: [] }),
    },
    session: {
      validator: {
        fields: {
          token: v.string(),
        },
      },
      export: () => ({ indexes: [] }),
    },
  },
} as any;

describe('auth/create-api createApi()', () => {
  afterEach(() => {
    mock.restore();
  });

  test('builds typed validators and internal actions', async () => {
    const authCalls: any[] = [];
    const createAuth = (ctx: any) => {
      authCalls.push(ctx);
      return {
        options: {
          // Override built-in unique fields so checkUniqueFields returns early.
          plugins: [
            {
              schema: {
                user: {
                  fields: { email: { unique: false }, name: { unique: false } },
                },
                session: { fields: { token: { unique: false } } },
              },
            },
          ],
        },
        api: {
          getLatestJwks: () => 'jwks',
          rotateKeys: () => 'rotated',
        },
      };
    };

    const api = createApi(schema, createAuth as any);

    expect(api).toHaveProperty('create');
    expect(api).toHaveProperty('findOne');
    expect(api).toHaveProperty('findMany');
    expect(api).toHaveProperty('updateOne');
    expect(api).toHaveProperty('updateMany');
    expect(api).toHaveProperty('deleteOne');
    expect(api).toHaveProperty('deleteMany');
    expect(api).toHaveProperty('getLatestJwks');
    expect(api).toHaveProperty('rotateKeys');

    await expect(
      (api.getLatestJwks as any)._handler({ id: 'ctx1' }, {})
    ).resolves.toBe('jwks');
    await expect(
      (api.rotateKeys as any)._handler({ id: 'ctx2' }, {})
    ).resolves.toBe('rotated');

    // createApi() calls createAuth({} as any) once during construction to read options.
    // The two action handlers call createAuth(ctx) for the provided ctx values.
    expect(authCalls).toEqual([{}, { id: 'ctx1' }, { id: 'ctx2' }]);
  });

  test('generated functions execute their handler closures (coverage smoke)', async () => {
    const createAuth = (_ctx: any) => ({
      options: {
        // Override built-in unique fields so checkUniqueFields returns early.
        plugins: [
          {
            schema: {
              user: {
                fields: { email: { unique: false }, name: { unique: false } },
              },
              session: { fields: { token: { unique: false } } },
            },
          },
        ],
      },
      api: {
        getLatestJwks: () => 'jwks',
        rotateKeys: () => 'rotated',
      },
    });

    const api = createApi(schema, createAuth as any);

    const store = new Map<string, any>([
      ['user-1', { _id: 'user-1', email: 'a@site.com', name: 'alice' }],
      ['user-2', { _id: 'user-2', email: 'b@site.com', name: 'bob' }],
    ]);

    const runMutation = mock(async (handle: string, args: any) => {
      if (handle === 'before-create') return { ...args.data, name: 'created' };
      if (handle === 'before-update')
        return { ...args.update, name: 'updated' };
      if (handle === 'before-delete') return { ...args.doc, name: 'deleted' };
    });

    const ctx = {
      db: {
        insert: async (_model: string, data: Record<string, unknown>) => {
          const id = `user-${store.size + 1}`;
          store.set(id, { _id: id, ...data });
          return id;
        },
        get: async (id: string) => store.get(id) ?? null,
        patch: async (id: string, update: Record<string, unknown>) => {
          const existing = store.get(id);
          if (!existing) return;
          store.set(id, { ...existing, ...update });
        },
        delete: async (id: string) => {
          store.delete(id);
        },
      },
      runMutation,
    };

    await expect(
      (api.create as any)._handler(ctx, {
        beforeCreateHandle: 'before-create',
        onCreateHandle: 'on-create',
        input: { model: 'user', data: { email: 'c@site.com', name: 'c' } },
        select: ['email'],
      })
    ).resolves.toEqual({ email: 'c@site.com' });

    await expect(
      (api.findOne as any)._handler(ctx, {
        model: 'user',
        where: [{ field: '_id', operator: 'eq', value: 'user-1' }],
      })
    ).resolves.toMatchObject({ _id: 'user-1' });

    await expect(
      (api.findMany as any)._handler(ctx, {
        model: 'user',
        paginationOpts: { cursor: null, numItems: 10 },
        where: [{ field: '_id', operator: 'in', value: ['user-1', 'user-2'] }],
      })
    ).resolves.toMatchObject({ isDone: true });

    await expect(
      (api.updateOne as any)._handler(ctx, {
        beforeUpdateHandle: 'before-update',
        onUpdateHandle: 'on-update',
        input: {
          model: 'user',
          update: { name: 'ignored' },
          where: [{ field: '_id', operator: 'eq', value: 'user-1' }],
        },
      })
    ).resolves.toMatchObject({ _id: 'user-1', name: 'updated' });

    await expect(
      (api.updateMany as any)._handler(ctx, {
        beforeUpdateHandle: 'before-update',
        onUpdateHandle: 'on-update',
        input: {
          model: 'user',
          update: { name: 'ignored' },
          where: [
            { field: '_id', operator: 'in', value: ['user-1', 'user-2'] },
          ],
        },
        paginationOpts: { cursor: null, numItems: 10 },
      })
    ).resolves.toMatchObject({ isDone: true, count: expect.any(Number) });

    await expect(
      (api.deleteOne as any)._handler(ctx, {
        beforeDeleteHandle: 'before-delete',
        onDeleteHandle: 'on-delete',
        input: {
          model: 'user',
          where: [{ field: '_id', operator: 'eq', value: 'user-2' }],
        },
      })
    ).resolves.toMatchObject({ _id: 'user-2', name: 'deleted' });

    await expect(
      (api.deleteMany as any)._handler(ctx, {
        beforeDeleteHandle: 'before-delete',
        onDeleteHandle: 'on-delete',
        input: {
          model: 'user',
          where: [{ field: '_id', operator: 'in', value: ['user-1'] }],
        },
        paginationOpts: { cursor: null, numItems: 10 },
      })
    ).resolves.toMatchObject({ isDone: true, count: expect.any(Number) });

    expect(runMutation).toHaveBeenCalled();
  });

  test('skipValidation toggles exported arg schema shape', async () => {
    const createAuth = (_ctx: any) => ({
      options: {
        plugins: [
          {
            schema: {
              user: {
                fields: { email: { unique: false }, name: { unique: false } },
              },
              session: { fields: { token: { unique: false } } },
            },
          },
        ],
      },
      api: {
        getLatestJwks: () => 'jwks',
        rotateKeys: () => 'rotated',
      },
    });

    const strict = createApi(schema, createAuth as any);
    const loose = createApi(schema, createAuth as any, {
      skipValidation: true,
    });

    const strictFindOneArgs = JSON.parse((strict.findOne as any).exportArgs());
    const looseFindOneArgs = JSON.parse((loose.findOne as any).exportArgs());

    expect(strictFindOneArgs.value.model.fieldType.type).toBe('union');
    expect(looseFindOneArgs.value.model.fieldType.type).toBe('string');
  });

  test('options.internalMutation overrides internalMutationGeneric', async () => {
    const createAuth = (_ctx: any) => ({
      options: {
        plugins: [
          {
            schema: {
              user: {
                fields: { email: { unique: false }, name: { unique: false } },
              },
              session: { fields: { token: { unique: false } } },
            },
          },
        ],
      },
      api: {
        getLatestJwks: () => 'jwks',
        rotateKeys: () => 'rotated',
      },
    });

    const calls: any[] = [];
    const internalMutation = (cfg: any) => {
      calls.push(cfg);
      return internalMutationGeneric(cfg);
    };

    createApi(schema, createAuth as any, {
      internalMutation: internalMutation as any,
      skipValidation: true,
    });

    // create/deleteMany/deleteOne/updateMany/updateOne all use mutationBuilder
    expect(calls.length).toBe(5);
  });
});
