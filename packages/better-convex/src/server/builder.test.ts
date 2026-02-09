import {
  actionGeneric,
  httpActionGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  mutationGeneric,
  queryGeneric,
} from 'convex/server';
import { z } from 'zod';

import { initCRPC } from './builder';

const INTERNAL_QUERY_NOT_CONFIGURED_RE =
  /internalQuery base function not configured/i;
const INTERNAL_MUTATION_NOT_CONFIGURED_RE =
  /internalMutation base function not configured/i;
const INTERNAL_ACTION_NOT_CONFIGURED_RE =
  /internalAction base function not configured/i;

describe('server/builder', () => {
  test('create() only adds action/httpAction when configured', () => {
    const base = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    expect('action' in base).toBe(false);
    expect('httpAction' in base).toBe(false);

    const full = initCRPC.create({
      query: queryGeneric,
      internalQuery: internalQueryGeneric,
      mutation: mutationGeneric,
      internalMutation: internalMutationGeneric,
      action: actionGeneric,
      internalAction: internalActionGeneric,
      httpAction: httpActionGeneric,
    } as any);

    expect('action' in full).toBe(true);
    expect('httpAction' in full).toBe(true);
  });

  test('query.internal() throws when internalQuery is not configured', () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    expect(() => c.query.internal()).toThrow(INTERNAL_QUERY_NOT_CONFIGURED_RE);
  });

  test('internal queries set _crpcMeta.internal=true', () => {
    const c = initCRPC.create({
      query: queryGeneric,
      internalQuery: internalQueryGeneric,
      mutation: mutationGeneric,
      internalMutation: internalMutationGeneric,
    } as any);

    const fn = c.query
      .internal()
      .meta({ auth: 'required' })
      .input(z.object({ x: z.number() }))
      .query(async ({ input }) => input.x);

    expect((fn as any)._crpcMeta).toMatchObject({
      type: 'query',
      internal: true,
      auth: 'required',
    });
  });

  test('middleware can override ctx and input and getRawInput returns original args', async () => {
    const c = initCRPC
      .context({
        query: (_ctx) => ({ userId: null as string | null }),
        mutation: (_ctx) => ({ userId: null as string | null }),
      })
      .create({
        query: queryGeneric,
        internalQuery: internalQueryGeneric,
        mutation: mutationGeneric,
        internalMutation: internalMutationGeneric,
      } as any);

    const withAuth = c.query.use(async ({ ctx, input, getRawInput, next }) => {
      expect(await getRawInput()).toEqual({ x: 1 });
      expect(input).toEqual({ x: 1 });
      return next({ ctx: { ...ctx, userId: 'u1' }, input: { x: 2 } });
    });

    const fn = withAuth
      .input(z.object({ x: z.number() }))
      .query(async ({ ctx, input }) => ({
        userId: (ctx as any).userId,
        x: input.x,
      }));

    await expect((fn as any)._handler({}, { x: 1 })).resolves.toEqual({
      userId: 'u1',
      x: 2,
    });
  });

  test('input schemas are merged when chained', async () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    const fn = c.query
      .input(z.object({ a: z.string() }))
      .input(z.object({ b: z.number() }))
      .query(async ({ input }) => input);

    await expect((fn as any)._handler({}, { a: 'x', b: 1 })).resolves.toEqual({
      a: 'x',
      b: 1,
    });

    await expect((fn as any)._handler({}, { a: 'x' })).rejects.toBeTruthy();
  });

  test('paginated() records limit in _crpcMeta', () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    const fn = c.query
      .paginated({ limit: 10, item: z.object({ id: z.string() }) })
      .query(async ({ input }) => ({
        continueCursor: 'c',
        isDone: true,
        page: [{ id: String(input.limit) }],
      }));

    expect((fn as any)._crpcMeta).toMatchObject({ type: 'query', limit: 10 });
  });

  test('defaultMeta is applied and meta() merges values', () => {
    const c = initCRPC
      .meta<{ auth?: string; tag?: string; extra?: string }>()
      .create({
        defaultMeta: { auth: 'optional' },
        query: queryGeneric,
        mutation: mutationGeneric,
      } as any);

    const fn = c.query
      .meta({ tag: 't1' })
      .meta({ extra: 't2' })
      .query(async () => 'ok');

    expect((fn as any)._crpcMeta).toMatchObject({
      type: 'query',
      internal: false,
      auth: 'optional',
      tag: 't1',
      extra: 't2',
    });
  });

  test('c.middleware().pipe() can be passed to .use()', async () => {
    const c = initCRPC
      .context({
        query: () => ({ userId: null as string | null }),
        mutation: () => ({ userId: null as string | null }),
      })
      .create({
        query: queryGeneric,
        mutation: mutationGeneric,
      } as any);

    const withUser = c.middleware(({ ctx, next }) =>
      next({ ctx: { ...ctx, userId: 'u1' } })
    );

    const withRole = withUser.pipe(({ ctx, next }) =>
      next({ ctx: { ...ctx, role: 'admin' } })
    );

    const fn = c.query
      .use(withRole as any)
      .input(z.object({ x: z.number() }))
      .query(async ({ ctx, input }) => ({
        userId: (ctx as any).userId,
        role: (ctx as any).role,
        x: input.x,
      }));

    await expect((fn as any)._handler({}, { x: 1 })).resolves.toEqual({
      userId: 'u1',
      role: 'admin',
      x: 1,
    });
  });

  test('query.output() validates returns schema', async () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    const ok = c.query
      .output(z.object({ ok: z.literal(true) }))
      .query(async () => ({ ok: true }));

    await expect((ok as any)._handler({}, {})).resolves.toEqual({ ok: true });

    const bad = c.query
      .output(z.object({ ok: z.literal(true) }))
      .query(async () => ({ ok: false }) as any);

    await expect((bad as any)._handler({}, {})).rejects.toBeTruthy();
  });

  test('paginated() clamps limit and defaults cursor', async () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    const fn = c.query
      .paginated({ limit: 10, item: z.object({ id: z.string() }) })
      .query(async ({ input }) => ({
        continueCursor: 'next',
        isDone: true,
        page: [{ id: `${input.limit}:${String((input as any).cursor)}` }],
      }));

    await expect(
      (fn as any)._handler({}, { limit: 999 })
    ).resolves.toMatchObject({
      page: [{ id: '10:null' }],
    });

    await expect(
      (fn as any)._handler({}, { cursor: 'c1', limit: 5 })
    ).resolves.toMatchObject({
      page: [{ id: '5:c1' }],
    });
  });

  test('mutation.internal() throws when internalMutation is not configured', () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
    } as any);

    expect(() => c.mutation.internal()).toThrow(
      INTERNAL_MUTATION_NOT_CONFIGURED_RE
    );
  });

  test('mutation builder supports use(), output(), and internal() meta', async () => {
    const c = initCRPC.create({
      query: queryGeneric,
      internalQuery: internalQueryGeneric,
      mutation: mutationGeneric,
      internalMutation: internalMutationGeneric,
    } as any);

    const fn = c.mutation
      .use(async ({ ctx, next }) => next({ ctx: { ...ctx, flag: true } }))
      .internal()
      .meta({ tag: 'm' } as any)
      .input(z.object({ x: z.number() }))
      .output(z.object({ x: z.number(), flag: z.boolean() }))
      .mutation(async ({ ctx, input }) => ({
        x: input.x,
        flag: (ctx as any).flag,
      }));

    expect((fn as any)._crpcMeta).toMatchObject({
      type: 'mutation',
      internal: true,
      tag: 'm',
    });

    await expect((fn as any)._handler({}, { x: 1 })).resolves.toEqual({
      x: 1,
      flag: true,
    });

    const bad = c.mutation
      .output(z.object({ ok: z.literal(true) }))
      .mutation(async () => ({ ok: false }) as any);

    await expect((bad as any)._handler({}, {})).rejects.toBeTruthy();
  });

  test('action.internal() throws when internalAction is not configured', () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
      action: actionGeneric,
    } as any);

    expect(() => (c as any).action.internal()).toThrow(
      INTERNAL_ACTION_NOT_CONFIGURED_RE
    );
  });

  test('action builder supports use(), output(), and internal() meta', async () => {
    const c = initCRPC.create({
      query: queryGeneric,
      mutation: mutationGeneric,
      action: actionGeneric,
      internalAction: internalActionGeneric,
    } as any);

    const fn = (c as any).action
      .use(
        async ({ ctx, next }: any) => next({ ctx: { ...ctx, flag: true } })
      )
      .internal()
      .meta({ tag: 'a' } as any)
      .input(z.object({ x: z.number() }))
      .output(z.object({ x: z.number(), flag: z.boolean() }))
      .action(async ({ ctx, input }: any) => ({
        x: input.x,
        flag: (ctx as any).flag,
      }));

    expect((fn as any)._crpcMeta).toMatchObject({
      type: 'action',
      internal: true,
      tag: 'a',
    });

    await expect((fn as any)._handler({}, { x: 1 })).resolves.toEqual({
      x: 1,
      flag: true,
    });
  });

  test('initCRPC entrypoints (dataModel/meta/context.meta) are callable', () => {
    expect(initCRPC.dataModel<any>()).toBeTruthy();
    expect(initCRPC.meta<{ tag?: string }>()).toBeTruthy();

    const c = initCRPC
      .context({
        query: () => ({ ok: true }),
        mutation: () => ({ ok: true }),
      })
      .meta<{ auth?: string }>()
      .create({
        defaultMeta: { auth: 'required' },
        query: queryGeneric,
        mutation: mutationGeneric,
      } as any);

    const fn = c.query.query(async ({ ctx }) => (ctx as any).ok);
    expect((fn as any)._crpcMeta).toMatchObject({ auth: 'required' });
  });
});
