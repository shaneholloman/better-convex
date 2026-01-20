---
"better-convex": minor
---

### HTTP Client: Hybrid API

The HTTP client now uses a hybrid API combining tRPC-style JSON body at root level with explicit `params`/`searchParams` for URL data.

#### Breaking Changes

- **Query/mutation args restructured**: Path params and search params now use explicit keys instead of flat merging
  - Before: `queryOptions({ id: '123', limit: 10 })`
  - After: `queryOptions({ params: { id: '123' }, searchParams: { limit: '10' } })`
- **Client options in args**: `fetch`, `init`, `headers` go in args (1st param)
  - `queryOptions(args?, queryOpts?)` - args = params/searchParams/form/headers/etc
  - `mutationOptions(mutationOpts?)` - client opts go in `mutate(args)` call
- **Server handler `query` renamed to `searchParams`**: Consistent naming between client and server
  - Before: `.query(async ({ query }) => { query.limit })`
  - After: `.query(async ({ searchParams }) => { searchParams.limit })`

#### New Features

- **Explicit input args**: `params`, `searchParams` keys for clear separation
- **JSON body at root**: Non-reserved keys spread at root level (tRPC-style): `mutate({ title: 'New' })`
- **Typed form uploads**: `.form()` builder method for typed FormData schemas (client args + server handler)
- **Client options in args**: Per-request `fetch`, `init`, `headers` in args (1st param)
- **mutationOptions for GET**: Use `useMutation` for one-time fetches (exports/downloads) without caching

#### Migration

```tsx
// Client: Before
crpc.http.todos.list.queryOptions({ limit: 10 });
updateTodo.mutate({ id, completed: true });
deleteTodo.mutate({ id });

// Client: After
crpc.http.todos.list.queryOptions({ searchParams: { limit: "10" } });
updateTodo.mutate({ params: { id }, completed: true });
deleteTodo.mutate({ params: { id } });

// Headers go in args (1st param)
// Before: queryOptions({ header: { 'X-Custom': 'value' } })
// After:
crpc.http.todos.list.queryOptions({ headers: { 'X-Custom': 'value' } });

// Mutations: client opts in mutate args
updateTodo.mutate({ params: { id }, completed: true, headers: { 'X-Custom': 'value' } });

// Server: Before
.query(async ({ query }) => ({ limit: query.limit }))

// Server: After
.query(async ({ searchParams }) => ({ limit: searchParams.limit }))

// Server: Typed form (new)
.form(z.object({ file: z.instanceof(Blob) }))
.mutation(async ({ form }) => {
  // form.file is typed as Blob
})
```
