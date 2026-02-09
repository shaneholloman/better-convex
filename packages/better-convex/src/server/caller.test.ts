import { makeFunctionReference } from 'convex/server';

import { createServerCaller } from './caller';

describe('server/caller', () => {
  test('routes calls to fetchQuery/fetchMutation/fetchAction based on meta', async () => {
    const api = {
      posts: {
        list: makeFunctionReference<'query'>('posts:list'),
        create: makeFunctionReference<'mutation'>('posts:create'),
        doThing: makeFunctionReference<'action'>('posts:doThing'),
      },
      nested: {
        queries: {
          list: makeFunctionReference<'query'>('nested/queries:list'),
        },
      },
    } as const;

    const fetchQuery = mock(async (_fn: any, _args: any, _opts?: any) => 'Q');
    const fetchMutation = mock(
      async (_fn: any, _args: any, _opts?: any) => 'M'
    );
    const fetchAction = mock(async (_fn: any, _args: any, _opts?: any) => 'A');

    const meta = {
      posts: {
        list: { type: 'query' },
        create: { type: 'mutation' },
        doThing: { type: 'action' },
      },
      'nested/queries': {
        list: { type: 'query' },
      },
    } as any;

    const caller = createServerCaller(api, {
      fetchQuery: fetchQuery as any,
      fetchMutation: fetchMutation as any,
      fetchAction: fetchAction as any,
      meta,
    });

    await expect(caller.posts.list({ tag: 'x' })).resolves.toBe('Q');
    await expect(caller.posts.create({ title: 'hi' })).resolves.toBe('M');
    await expect(caller.posts.doThing({})).resolves.toBe('A');
    await expect(caller.nested.queries.list()).resolves.toBe('Q');

    expect(fetchQuery.mock.calls.length).toBeGreaterThan(0);
    expect(fetchMutation.mock.calls.length).toBeGreaterThan(0);
    expect(fetchAction.mock.calls.length).toBeGreaterThan(0);

    expect(fetchQuery.mock.calls[0]?.[0]).toBe(api.posts.list);
    expect(fetchMutation.mock.calls[0]?.[0]).toBe(api.posts.create);
    expect(fetchAction.mock.calls[0]?.[0]).toBe(api.posts.doThing);
  });

  test('passes args and caller opts through to fetchers (including skipUnauth)', async () => {
    const api = {
      users: {
        me: makeFunctionReference<'query'>('users:me'),
      },
    } as const;

    const fetchQuery = mock(async (_fn: any, _args: any, _opts?: any) => 'ok');

    const caller = createServerCaller(api, {
      fetchQuery: fetchQuery as any,
      fetchMutation: mock(async () => null) as any,
      fetchAction: mock(async () => null) as any,
      meta: { users: { me: { type: 'query' } } } as any,
    });

    await expect(
      caller.users.me({ include: 'profile' }, { skipUnauth: true })
    ).resolves.toBe('ok');

    expect(fetchQuery).toHaveBeenCalledWith(
      api.users.me,
      { include: 'profile' },
      { skipUnauth: true }
    );
  });
});
