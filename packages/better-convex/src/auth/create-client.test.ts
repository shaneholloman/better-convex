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
