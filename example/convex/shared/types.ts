import type { InferInsertModel, InferSelectModel } from 'better-convex/orm';
import type {
  inferApiInputs,
  inferApiOutputs,
  WithHttpRouter,
} from 'better-convex/server';
import type { api } from '../functions/_generated/api';
// biome-ignore lint/style/noRestrictedImports: type
import type { appRouter } from '../functions/http';
// biome-ignore lint/style/noRestrictedImports: type
import type { tables } from '../functions/schema';

export type TableName = keyof typeof tables;
export type Select<T extends TableName> = InferSelectModel<(typeof tables)[T]>;
export type Insert<T extends TableName> = InferInsertModel<(typeof tables)[T]>;

export type Api = WithHttpRouter<typeof api, typeof appRouter>;

export type ApiInputs = inferApiInputs<Api>;
export type ApiOutputs = inferApiOutputs<Api>;
