import { api } from '@convex/api';
import { meta } from '@convex/meta';
import type { Api } from '@convex/types';
import { createCRPCContext } from 'better-convex/react';
import { env } from '@/env';

export const { CRPCProvider, useCRPC, useCRPCClient } = createCRPCContext<Api>({
  api,
  meta,
  convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
});
