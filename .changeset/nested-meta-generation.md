---
"better-convex": patch
---

Support nested file structures in meta generation. Codegen now recursively scans subdirectories in the functions directory using `globSync('**/*.ts')`.

Nested files use their path as the namespace key with `/` separator:

```typescript
// convex/functions/items/queries.ts exports are now included
export const meta = {
  todos: { create: {...}, list: {...} },
  'items/queries': { list: {...}, get: {...} },
} as const;
```

- Backward compatible: existing flat structure works unchanged
- `_` prefixed files/directories are excluded
- Shared `getFuncRef`, `getFunctionType`, `getFunctionMeta` utilities extracted to `meta-utils.ts`
