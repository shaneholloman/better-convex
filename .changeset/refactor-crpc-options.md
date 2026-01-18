---
"better-convex": minor
---

**BREAKING:** Refactored `createCRPCContext` and `createServerCRPCProxy` to use options object:

Before:

```ts
createCRPCContext(api, meta);
createServerCRPCProxy(api, meta);
```

After:

```ts
createCRPCContext<Api>({ api, meta, convexSiteUrl });
createServerCRPCProxy<Api>({ api, meta });
```

**Feature:** Added HTTP routes support via `WithHttpRouter` helper:

```ts
// convex/shared/types.ts - before
export type Api = typeof api;

// convex/shared/types.ts - after
import { WithHttpRouter } from "better-convex/server";
import type { appRouter } from "../functions/http";

export type Api = WithHttpRouter<typeof api, typeof appRouter>;
// ApiInputs['http']['todos'] now works for HTTP route type inference
```

**Feature:** Added `httpAction` builder to CRPC for type-safe HTTP routes:

```ts
// crpc.ts - pass httpAction to initCRPC.create()
const c = initCRPC.dataModel<DataModel>().create({
  query,
  mutation,
  action,
  httpAction,
});

export const publicRoute = c.httpAction;
export const authRoute = c.httpAction.use(authMiddleware);
export const router = c.router;
```

**Feature:** Added `registerCRPCRoutes` to register HTTP routes to Convex httpRouter with CORS:

```ts
// http.ts
import { registerCRPCRoutes } from "better-convex/server";

export const appRouter = router({
  health,
  todos: todosRouter,
});

registerCRPCRoutes(http, appRouter, {
  httpAction,
  cors: {
    allowedOrigins: [process.env.SITE_URL!],
    allowCredentials: true,
  },
});
```

**Fix:** Improved authentication in `ConvexAuthProvider`:

- **FetchAccessTokenContext**: New context passes `fetchAccessToken` through React tree - eliminates race conditions where token wasn't available during render
- **Token Expiration Tracking**: Added `expiresAt` field with `decodeJwtExp()` - 60s cache leeway prevents unnecessary token refreshes
- **SSR Hydration Fix**: Defensive `isLoading` check prevents UNAUTHORIZED errors when Better Auth briefly returns null during hydration
- **Removed HMR persistence**: No more globalThis Symbol storage (`getPersistedToken`/`persistToken`)
- **Simplified AuthStore**: Removed `guard` method and `AuthEffect` - state synced via `useConvexAuth()` directly
