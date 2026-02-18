import { api } from '@convex/api';
import { meta } from '@convex/meta';
import { convexBetterAuth } from 'better-convex/auth-nextjs';
import { env } from '@/env';

export const { createContext, createCaller, handler } = convexBetterAuth({
  api,
  convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
  meta,
});
