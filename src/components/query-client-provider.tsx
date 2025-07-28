'use client';

import { env } from '@/env';
import { ConvexQueryClient } from '@convex-dev/react-query';
import {
  defaultShouldDehydrateQuery,
  QueryClient,
  QueryClientProvider as BaseQueryClientProvider,
} from '@tanstack/react-query';
import { ConvexReactClient } from 'convex/react';
import { toast } from 'sonner';
import SuperJSON from 'superjson';

const createQueryClient = () => {
  const convex = new ConvexReactClient(env.NEXT_PUBLIC_CONVEX_URL);
  const convexQueryClient = new ConvexQueryClient(convex);

  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        shouldRedactErrors: () => {
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.
          return false;
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
      mutations: {
        onError: (error: any) => {
          if (error.data?.message) {
            toast.error(error.data?.message);
          }
        },
      },
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        refetchInterval: false,
        refetchOnMount: true,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: false,
        retryOnMount: false,
        staleTime: 30 * 1000,
      },
    },
  });
  convexQueryClient.connect(queryClient);

  return queryClient;
};

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

export function QueryClientProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <BaseQueryClientProvider client={queryClient}>
      {props.children}
    </BaseQueryClientProvider>
  );
}
