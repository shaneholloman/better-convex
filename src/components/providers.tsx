import { QueryClientProvider } from '@/components/query-client-provider';
import { ConvexProvider } from '@/lib/convex/components/convex-provider';
import { isAuth } from '@/lib/convex/server';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export async function Providers({ children }) {
  const isAuthenticated = await isAuth();

  return (
    <ConvexProvider isAuthenticated={isAuthenticated}>
      <QueryClientProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </QueryClientProvider>
    </ConvexProvider>
  );
}
