import { crpc, getQueryClient, prefetch } from '@/lib/convex/rsc';
import { HttpDemo } from './http-demo';

export default async function HttpPage() {
  // Prefetch HTTP queries on server
  prefetch(crpc.http.health.queryOptions({}));

  await getQueryClient().prefetchQuery(
    crpc.http.todos.list.queryOptions({ limit: 10 })
  );

  return <HttpDemo />;
}
