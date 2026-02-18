---
name: convex
description: This skill should be used when adding end-to-end features to a better-convex app, working with "cRPC procedures", "ORM queries", "Convex schema", "auth middleware", "triggers", "ctx.orm", "useCRPC", or implementing server/client patterns with better-convex. Core runtime patterns for cRPC + ORM + auth + triggers. Load first for any better-convex feature work.
---

# Better Convex Feature Work

Ship features on an already configured better-convex app.
For setup, installation, env, or initial auth wiring, consult `references/setup.md` first.

## Skill Loading Contract

1. Load only reference files needed by the current feature.
2. Keep context minimal: core + relevant topical references.

## Scope

In scope:

- Schema/index/relation/trigger changes
- cRPC procedure design and middleware usage
- ORM query/mutation implementation via `ctx.orm`
- React/TanStack Query integration via `useCRPC()`
- Runtime auth/permissions/rate limits

Out of scope:

- Package install / bootstrap / one-time wiring
- Project scaffolding or initial file layout

## Core Principles

1. New feature code is cRPC + ORM first.
2. Treat Drizzle/tRPC/Better Auth parity as baseline; focus on better-convex/Convex specifics.
3. Keep runtime paths explicit and bounded (indexes, limits, pagination).
4. Prefer reusable middleware and schema triggers over duplicated mutation logic.
5. Keep auth/session/rate-limit checks on server, not just UI.

## Always-Apply Rules

- **Delta from parity:** Use `ctx.orm` as default data interface.
- Use `initCRPC.create()` builders (`publicQuery`, `authQuery`, `authMutation`, etc.), not raw handler objects.
- **Delta from parity:** Use `getAuth(ctx)` (not legacy `createAuth(ctx)`).
- **Delta from parity:** Use `authClient.adapter(ctx, getAuthOptions)` (not `httpAdapter`).
- Add `.meta({ rateLimit: 'scope/action' })` to user-facing mutations.
- Throw `CRPCError` for expected runtime failures.
- **Delta from parity:** Put cross-row side effects in schema triggers.

## Common Mistakes

| Mistake                                       | Correct Pattern                                   |
| --------------------------------------------- | ------------------------------------------------- |
| `ctx.orm` / Ents patterns in new feature code | `ctx.orm.query.*`, `ctx.orm.insert/update/delete` |
| Raw `query/mutation/action` directly          | cRPC procedure builders                           |
| Missing output schema / weak contracts        | Explicit `.output(...)` on procedures             |
| No write throttling                           | `.meta({ rateLimit: ... })` on user-facing writes |
| Overusing full scans                          | Add index + bounded filters + limit/cursor        |
| Duplicating side effects in many mutations    | Centralize with schema triggers                   |

## E2E Feature Checklist

1. Data model:

- Add/adjust schema fields and relations.
- Add indexes for expected filter/order/search paths.
- Decide whether trigger is needed for side effects.

2. Procedure layer:

- Pick auth level (`public`, `optionalAuth`, `auth`, `private`).
- Define strict `input` + `output` contracts.
- Add rate-limit metadata for writes.

3. Data access:

- Reads via `ctx.orm.query.<table>.*`.
- Writes via `ctx.orm.insert/update/delete`.
- Keep all user-facing list operations bounded.

4. Client:

- `useQuery(crpc.x.y.queryOptions(args, opts))`.
- `useMutation(crpc.x.y.mutationOptions(opts))`.
- `useInfiniteQuery(crpc.x.y.infiniteQueryOptions(args, opts))` for cursors.

5. Error handling:

- Throw typed `CRPCError` on business failures.
- Use `findFirstOrThrow` for required rows.
- Avoid leaking internal errors to UI.

## Core Server Patterns

Assumes procedure builders already exist in `convex/lib/crpc.ts`.  
If they do not, use `references/setup.md` for one-time wiring.

**Edit:** `convex/functions/*.ts`

```ts
import { z } from "zod";
import { eq } from "better-convex/orm";
import { CRPCError } from "better-convex/server";
import { authQuery, authMutation } from "../lib/crpc";
import { project } from "./schema";

export const listProjects = authQuery
  .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
  .output(
    z.array(
      z.object({ id: z.string(), name: z.string(), createdAt: z.number() })
    )
  )
  .query(async ({ ctx, input }) => {
    return await ctx.orm.query.project.findMany({
      where: { ownerId: ctx.userId },
      orderBy: { createdAt: "desc" },
      limit: input.limit,
      columns: { id: true, name: true, createdAt: true },
    });
  });

export const renameProject = authMutation
  .meta({ rateLimit: "project/rename" })
  .input(z.object({ id: z.string(), name: z.string().min(1).max(120) }))
  .output(z.null())
  .mutation(async ({ ctx, input }) => {
    const row = await ctx.orm.query.project.findFirst({
      where: { id: input.id, ownerId: ctx.userId },
    });

    if (!row)
      throw new CRPCError({ code: "NOT_FOUND", message: "Project not found" });

    await ctx.orm
      .update(project)
      .set({ name: input.name })
      .where(eq(project.id, row.id));

    return null;
  });
```

## Auth Runtime Pattern

- **Delta from parity:** `getAuth(ctx)` is the auth entrypoint in query/mutation/action/http contexts.
- **Delta from parity:** Better Auth adapter path is `authClient.adapter(ctx, getAuthOptions)`.
- Keep app-level reads/writes on `ctx.orm`.

```ts
const auth = getAuth(ctx);
const session = await auth.api.getSession({ headers: await getHeaders(ctx) });
if (!session) throw new CRPCError({ code: "UNAUTHORIZED" });
```

## ORM Runtime Pattern

```ts
const posts = await ctx.orm.query.post.findMany({
  where: { organizationId: input.orgId, status: "published" },
  orderBy: { createdAt: "desc" },
  limit: 25,
  with: { author: true },
});

await ctx.orm.insert(post).values({
  title: input.title,
  body: input.body,
  organizationId: input.orgId,
  authorId: ctx.userId,
});
```

## Trigger Runtime Pattern

Define side effects in schema trigger declarations.

```ts
import { convexTable, onChange } from "better-convex/orm";

export const message = convexTable(
  "message",
  {
    /* fields */
  },
  () => [
    onChange(async (ctx, change) => {
      if (change.operation === "delete") return;
      // bounded side effect write
      await ctx.orm
        .update(thread)
        .set({ lastMessageAt: Date.now() })
        .where(eq(thread.id, change.newDoc.threadId));
    }),
  ]
);
```

## React / RSC Runtime Pattern

```ts
const crpc = useCRPC();

const listQuery = useQuery(
  crpc.project.listProjects.queryOptions({ limit: 20 })
);

const renameMutation = useMutation(
  crpc.project.renameProject.mutationOptions()
);

const infinite = useInfiniteQuery(
  crpc.project.feed.infiniteQueryOptions({ orgId })
);
```

## Performance Defaults

1. Every user-facing list query has limit/cursor bounds.
2. Query shape matches available indexes.
3. Expensive post-fetch operations happen after indexed narrowing.
4. Trigger handlers stay bounded and idempotent.
5. Large counts/rankings use aggregate components.

## Testing Defaults

1. Runtime tests verify auth, policy, not-found, conflict, and side effects.
2. ORM tests verify type inference + runtime behavior.
3. Scheduled features use fake timers and bounded batch assertions.

## Advanced References

For detailed guidance on specific topics, consult:

- **`references/setup.md`** - One-time bootstrap, install, env, initial wiring
- **`references/react.md`** - React/RSC client patterns
- **`references/orm.md`** - Complete ORM API
- **`references/filters.md`** - Filters and search patterns
- **`references/aggregates.md`** - Aggregate components
- **`references/http.md`** - HTTP endpoint patterns
- **`references/scheduling.md`** - Scheduled functions
- **`references/testing.md`** - Testing patterns
- **`references/auth.md`** - Auth core patterns
- **`references/auth-admin.md`** - Admin auth patterns
- **`references/auth-organizations.md`** - Organization/multi-tenant auth
- **`references/auth-polar.md`** - Polar billing/subscription auth patterns
- **`references/doc-guidelines.md`** - Documentation maintenance
