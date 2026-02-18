---
"better-convex": patch
---

Migration example: https://github.com/udecode/better-convex/pull/82

Added `AnyColumn` type export for self-referencing foreign keys (mirrors Drizzle's `AnyPgColumn`).

```ts
import { type AnyColumn, convexTable, text } from "better-convex/orm";

export const comments = convexTable("comments", {
  body: text().notNull(),
  parentId: text().references((): AnyColumn => comments.id, {
    onDelete: "cascade",
  }),
});
```
