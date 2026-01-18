import type {
  inferApiInputs,
  inferApiOutputs,
  WithHttpRouter,
} from 'better-convex/server';
import type { WithoutSystemFields } from 'convex/server';

import type { api } from '../functions/_generated/api';
import type { Doc, TableNames } from '../functions/_generated/dataModel';
// biome-ignore lint/style/noRestrictedImports: type
import type { appRouter } from '../functions/http';

export type DocWithId<TableName extends TableNames> = WithoutSystemFields<
  Doc<TableName>
> & {
  id: Doc<TableName>['_id'];
};

export type Api = WithHttpRouter<typeof api, typeof appRouter>;
export type ApiInputs = inferApiInputs<Api>;
export type ApiOutputs = inferApiOutputs<Api>;
