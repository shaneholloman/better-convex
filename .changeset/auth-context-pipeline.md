---
"better-convex": minor
---

Auth APIs now support config-first DB trigger wiring and a unified context hook.

- `createClient` and `createApi` support `dbTriggers` for `wrapDB`-based mutation wiring.
- Replaced `mutationContext` + `triggerContext` with a single `context` option.
- Auth mutation context order is now `ctx -> dbTriggers.wrapDB(ctx) -> context(ctx)`.
- Keeps existing auth lifecycle hooks and ORM-first CRUD behavior unchanged.
