---
"better-convex": patch
---

## Fixes

- Fix `better-convex/plugins/ratelimit` so `limit()` and `check()` no longer call timer APIs (`setTimeout`/`clearTimeout`) during normal execution.
- Remove `blockUntilReady()`
