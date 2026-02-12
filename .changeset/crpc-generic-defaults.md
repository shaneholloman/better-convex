---
"better-convex": minor
---

cRPC now uses generic Convex builders by default, so `initCRPC.create()` no longer requires passing generated server builders.

- Added no-arg `initCRPC.create()` support.
- `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, `internalAction`, and `httpAction` now default to Convex generic builders when omitted.
- Full cRPC surface is now available by default (`c.query`, `c.mutation`, `.internal()`, `c.action`, `c.httpAction`).
- Explicit builder overrides remain supported for advanced custom wrappers.
