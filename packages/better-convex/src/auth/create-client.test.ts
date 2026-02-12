import { createClient } from './create-client';

const authFunctions = {
  beforeCreate: 'beforeCreate',
  beforeDelete: 'beforeDelete',
  beforeUpdate: 'beforeUpdate',
  create: 'create',
  deleteMany: 'deleteMany',
  deleteOne: 'deleteOne',
  findMany: 'findMany',
  findOne: 'findOne',
  onCreate: 'onCreate',
  onDelete: 'onDelete',
  onUpdate: 'onUpdate',
  updateMany: 'updateMany',
  updateOne: 'updateOne',
} as any;

describe('createClient', () => {
  test('creates trigger API handlers that call configured trigger callbacks', async () => {
    const captured: any[] = [];
    const internalMutation = ((config: any) => {
      captured.push(config);
      return config;
    }) as any;

    const triggers = {
      user: {
        beforeCreate: async (_ctx: unknown, data: any) => ({
          ...data,
          tagged: true,
        }),
        beforeDelete: async (_ctx: unknown, doc: any) => ({
          ...doc,
          deletedByHook: true,
        }),
        beforeUpdate: async (_ctx: unknown, _doc: any, update: any) => ({
          ...update,
          updatedByHook: true,
        }),
        onCreate: async (_ctx: unknown, _doc: any) => {},
        onDelete: async (_ctx: unknown, _doc: any) => {},
        onUpdate: async (_ctx: unknown, _newDoc: any, _oldDoc: any) => {},
      },
    } as any;

    const client = createClient({
      authFunctions,
      internalMutation,
      schema: {} as any,
      triggers,
    });
    const api = client.triggersApi() as any;

    expect(captured).toHaveLength(6);

    const beforeCreate = await api.beforeCreate.handler(
      {},
      { data: { email: 'a@b.com' }, model: 'user' }
    );
    const beforeDelete = await api.beforeDelete.handler(
      {},
      { doc: { _id: 'u1' }, model: 'user' }
    );
    const beforeUpdate = await api.beforeUpdate.handler(
      {},
      {
        doc: { _id: 'u1' },
        model: 'user',
        update: { name: 'new' },
      }
    );

    expect(beforeCreate).toEqual({ email: 'a@b.com', tagged: true });
    expect(beforeDelete).toEqual({ _id: 'u1', deletedByHook: true });
    expect(beforeUpdate).toEqual({ name: 'new', updatedByHook: true });
  });

  test('falls back to original values when trigger callback is missing', async () => {
    const internalMutation = ((config: any) => config) as any;

    const client = createClient({
      authFunctions,
      internalMutation,
      schema: {} as any,
      triggers: {},
    });
    const api = client.triggersApi() as any;

    const beforeCreate = await api.beforeCreate.handler(
      {},
      { data: { email: 'a@b.com' }, model: 'missing' }
    );
    const beforeDelete = await api.beforeDelete.handler(
      {},
      { doc: { _id: 'u1' }, model: 'missing' }
    );
    const beforeUpdate = await api.beforeUpdate.handler(
      {},
      {
        doc: { _id: 'u1' },
        model: 'missing',
        update: { name: 'new' },
      }
    );

    expect(beforeCreate).toEqual({ email: 'a@b.com' });
    expect(beforeDelete).toEqual({ _id: 'u1' });
    expect(beforeUpdate).toEqual({ name: 'new' });
  });

  test('applies context before executing trigger callbacks', async () => {
    const internalMutation = ((config: any) => config) as any;

    const beforeCreate = mock(async (ctx: any, data: any) => ({
      ...data,
      usedOrm: ctx.orm === true,
    }));

    const client = createClient({
      authFunctions,
      internalMutation,
      schema: {} as any,
      context: async (ctx: any) => ({ ...ctx, orm: true }),
      triggers: {
        user: {
          beforeCreate,
        },
      } as any,
    });

    const api = client.triggersApi() as any;

    const result = await api.beforeCreate.handler(
      { db: {} },
      { data: { email: 'a@b.com' }, model: 'user' }
    );

    expect(beforeCreate).toHaveBeenCalled();
    expect(result).toEqual({ email: 'a@b.com', usedOrm: true });
  });

  test('applies dbTriggers, then context', async () => {
    const beforeCreate = mock(async (ctx: any, data: any) => ({
      ...data,
      order: ctx.order,
      transformed: {
        db: ctx.dbWrapped === true,
        context: ctx.contextWrapped === true,
      },
    }));

    const client = createClient({
      authFunctions,
      schema: {} as any,
      dbTriggers: {
        wrapDB: (ctx: any) => ({
          ...ctx,
          dbWrapped: true,
          order: [...(ctx.order ?? []), 'db'],
        }),
      },
      context: async (ctx: any) => ({
        ...ctx,
        contextWrapped: true,
        order: [...ctx.order, 'context'],
      }),
      triggers: {
        user: {
          beforeCreate,
        },
      } as any,
    });

    const api = client.triggersApi() as any;
    const result = await api.beforeCreate._handler(
      { db: {} },
      { data: { email: 'a@b.com' }, model: 'user' }
    );

    expect(beforeCreate).toHaveBeenCalled();
    expect(result).toEqual({
      email: 'a@b.com',
      order: ['db', 'context'],
      transformed: {
        db: true,
        context: true,
      },
    });
  });

  test('exposes adapter and httpAdapter factories', () => {
    const client = createClient({
      authFunctions,
      schema: {} as any,
    });

    expect(typeof client.adapter).toBe('function');
    expect(typeof client.httpAdapter).toBe('function');
    expect(client.authFunctions).toBe(authFunctions);
  });
});
