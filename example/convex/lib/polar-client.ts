import { Polar } from '@polar-sh/sdk';
import { getEnv } from './get-env';

export const getPolarClient = () =>
  // NOTE: safe in codegen because getEnv has defaults/codegen fallback.
  // Runtime still requires POLAR_ACCESS_TOKEN for real API calls.
  new Polar({
    accessToken: getEnv().POLAR_ACCESS_TOKEN!,
    server: getEnv().POLAR_SERVER,
  });
