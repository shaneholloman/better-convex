# Better Convex Example

Reference implementation for Better Convex.

This app is the source of truth for docs snippets and migration guidance.

## Stack

- Next.js App Router
- Convex backend
- Better Convex cRPC + ORM
- Better Auth
- TanStack Query

## Run Locally

1. Install deps from repo root:

```bash
bun install
```

2. Configure env files:

```bash
cp /Users/zbeyens/GitHub/better-convex/example/.env.example /Users/zbeyens/GitHub/better-convex/example/.env.local
cp /Users/zbeyens/GitHub/better-convex/example/convex/.env.example /Users/zbeyens/GitHub/better-convex/example/convex/.env
```

3. Start app + Convex processes:

```bash
bun --cwd /Users/zbeyens/GitHub/better-convex/example dev
```

4. Open:

- [http://localhost:3005](http://localhost:3005)

## Useful Commands

```bash
# Typecheck
bun --cwd /Users/zbeyens/GitHub/better-convex/example typecheck

# Lint
bun --cwd /Users/zbeyens/GitHub/better-convex/example lint

# Convex logs
bun --cwd /Users/zbeyens/GitHub/better-convex/example convex:logs

# Reset + seed data
bun --cwd /Users/zbeyens/GitHub/better-convex/example reset
bun --cwd /Users/zbeyens/GitHub/better-convex/example seed
```

## Architecture Map

- Server schema: `/Users/zbeyens/GitHub/better-convex/example/convex/functions/schema.ts`
- ORM context: `/Users/zbeyens/GitHub/better-convex/example/convex/lib/orm.ts`
- cRPC builder: `/Users/zbeyens/GitHub/better-convex/example/convex/lib/crpc.ts`
- HTTP entrypoint: `/Users/zbeyens/GitHub/better-convex/example/convex/functions/http.ts`
- React provider: `/Users/zbeyens/GitHub/better-convex/example/src/lib/convex/convex-provider.tsx`
- React cRPC context: `/Users/zbeyens/GitHub/better-convex/example/src/lib/convex/crpc.tsx`
- RSC helpers: `/Users/zbeyens/GitHub/better-convex/example/src/lib/convex/rsc.tsx`

## Notes

- IDs in auth context are plain `string` in this example.
- Use `ctx.orm` and cRPC procedures as the default server pattern.
- Use TanStack Query `useQuery`/`useMutation` with cRPC `queryOptions`/`mutationOptions` on client.
