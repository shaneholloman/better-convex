import { createOrm, type GenericOrmCtx } from 'better-convex/orm';

import type { MutationCtx, QueryCtx } from '../functions/_generated/server';
import { relations } from '../functions/schema';

const orm = createOrm({ schema: relations });

export type OrmCtx<Ctx extends QueryCtx | MutationCtx = QueryCtx> =
  GenericOrmCtx<Ctx, typeof relations>;

export type OrmQueryCtx = OrmCtx<QueryCtx>;
export type OrmMutationCtx = OrmCtx<MutationCtx>;

export function withOrm<Ctx extends QueryCtx | MutationCtx>(ctx: Ctx) {
  return orm.with(ctx) as OrmCtx<Ctx>;
}
