import type { Id } from '@convex/dataModel';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useAuthStatus } from 'better-convex/react';
import { useCRPC } from '@/lib/convex/crpc';

export const useCurrentUser = () => {
  const { isAuthenticated } = useAuthStatus();
  const crpc = useCRPC();

  const { data, ...rest } = useQuery(
    crpc.user.getCurrentUser.queryOptions(isAuthenticated ? {} : skipToken, {
      skipUnauth: true,
      placeholderData: {
        id: '0' as Id<'user'>,
        activeOrganization: {
          id: '0' as Id<'organization'>,
          logo: '',
          name: '',
          role: '',
          slug: '',
        },
        image: undefined,
        isAdmin: false,
        name: '',
        personalOrganizationId: undefined,
      },
    })
  );

  return {
    ...rest,
    ...data,
  };
};
