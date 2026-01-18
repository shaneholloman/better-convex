/**
 * HTTP Client
 *
 * tRPC-style typed HTTP client for cRPC HTTP endpoints.
 * For React apps, prefer `createCRPCContext` with HTTP options
 * which provides TanStack Query integration.
 *
 * @example
 * ```ts
 * import { createHttpClient } from 'better-convex/crpc';
 * import { meta } from '../convex/shared/meta';
 * import type { AppRouter } from '../convex/functions/http';
 *
 * const http = createHttpClient<AppRouter>({
 *   convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
 *   routes: meta._http!, // HTTP routes are merged into meta
 *   headers: () => ({
 *     Authorization: `Bearer ${getToken()}`,
 *   }),
 * });
 *
 * // Nested access (like tRPC)
 * const todo = await http.todos.get({ id: 'abc123' });
 * const newTodo = await http.todos.create({ title: 'New task' });
 *
 * // Flat access still works
 * const health = await http.health();
 * ```
 */

import type { CRPCHttpRouter, HttpRouterRecord } from '../server/http-router';
import {
  type HttpClient,
  HttpClientError,
  type HttpClientFromRouter,
  type HttpClientOptions,
  type HttpErrorCode,
  type HttpRouteMap,
} from './http-types';

/**
 * Extract path parameter names from a route path
 * e.g., '/users/:id/posts/:postId' -> ['id', 'postId']
 */
function extractPathParamNames(path: string): string[] {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * Execute an HTTP request to a cRPC endpoint
 */
async function executeHttpRequest(opts: {
  convexSiteUrl: string;
  route: { path: string; method: string };
  procedureName: string;
  input: unknown;
  headers?:
    | { [key: string]: string | undefined }
    | (() =>
        | { [key: string]: string | undefined }
        | Promise<{ [key: string]: string | undefined }>);
  fetch?: typeof fetch;
}): Promise<unknown> {
  const { method, path } = opts.route;
  const input = opts.input as Record<string, unknown> | undefined;
  const pathParamNames = extractPathParamNames(path);

  // Build URL with path params replaced (:id -> actual value)
  let url =
    opts.convexSiteUrl +
    path.replace(/:(\w+)/g, (_, key) => {
      const value = input?.[key];
      return value !== null && value !== undefined
        ? encodeURIComponent(String(value))
        : '';
    });

  // Resolve headers (support async headers fn for auth tokens)
  const headers =
    typeof opts.headers === 'function' ? await opts.headers() : opts.headers;

  // Build request based on method
  let body: string | undefined;
  if (method === 'GET') {
    // Query params for GET (exclude path params)
    const queryInput = input
      ? Object.fromEntries(
          Object.entries(input).filter(([k]) => !pathParamNames.includes(k))
        )
      : {};
    if (Object.keys(queryInput).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryInput)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
  } else {
    // Body for POST/PUT/PATCH/DELETE (exclude path params)
    const bodyInput = input
      ? Object.fromEntries(
          Object.entries(input).filter(([k]) => !pathParamNames.includes(k))
        )
      : {};
    if (Object.keys(bodyInput).length > 0) {
      body = JSON.stringify(bodyInput);
    }
  }

  const fetchFn = opts.fetch ?? globalThis.fetch;
  const response = await fetchFn(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: { code: 'UNKNOWN', message: response.statusText },
    }));

    const errorCode: HttpErrorCode =
      (errorData?.error?.code as HttpErrorCode) || 'UNKNOWN';
    const errorMessage = errorData?.error?.message || response.statusText;

    throw new HttpClientError({
      code: errorCode,
      status: response.status,
      procedureName: opts.procedureName,
      message: errorMessage,
    });
  }

  // Handle empty responses (204 No Content, etc.)
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0' || response.status === 204) {
    return;
  }

  return response.json();
}

/**
 * Create a recursive proxy for nested route access
 * Tracks path segments and executes request when function is called
 */
function createRecursiveProxy(
  opts: {
    convexSiteUrl: string;
    routes: HttpRouteMap;
    headers?:
      | { [key: string]: string | undefined }
      | (() =>
          | { [key: string]: string | undefined }
          | Promise<{ [key: string]: string | undefined }>);
    fetch?: typeof fetch;
    onError?: (error: HttpClientError) => void;
  },
  path: string[] = []
): unknown {
  return new Proxy(() => {}, {
    get(_, key: string) {
      // Return a new proxy with the key appended to path
      return createRecursiveProxy(opts, [...path, key]);
    },
    apply(_, __, args) {
      // When called as a function, execute the request
      const procedureName = path.join('.');
      const route = opts.routes[procedureName];

      if (!route) {
        throw new Error(`Unknown HTTP procedure: ${procedureName}`);
      }

      return (async () => {
        try {
          return await executeHttpRequest({
            convexSiteUrl: opts.convexSiteUrl,
            route,
            procedureName,
            input: args[0],
            headers: opts.headers,
            fetch: opts.fetch,
          });
        } catch (error) {
          if (opts.onError && error instanceof HttpClientError) {
            opts.onError(error);
          }
          throw error;
        }
      })();
    },
  });
}

/**
 * Create a typed HTTP client for cRPC HTTP routers
 *
 * Supports nested router access like tRPC:
 * - `http.todos.get({ id })` for nested routers
 * - `http.health()` for flat procedures
 *
 * For React apps, prefer using `createCRPCContext` with HTTP options
 * which provides TanStack Query integration (queryOptions, mutationOptions).
 *
 * @example
 * ```ts
 * import { createHttpClient } from 'better-convex/crpc';
 * import { meta } from '../convex/shared/meta';
 * import type { AppRouter } from '../convex/functions/http';
 *
 * const http = createHttpClient<AppRouter>({
 *   convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
 *   routes: meta._http!, // HTTP routes are in meta._http
 * });
 *
 * // Nested access
 * const todo = await http.todos.get({ id: 'abc123' });
 *
 * // Flat access
 * const health = await http.health();
 * ```
 */
export function createHttpClient<
  TRouter extends CRPCHttpRouter<any>,
  TRoutes extends HttpRouteMap = HttpRouteMap,
>(opts: HttpClientOptions<TRoutes>): HttpClientFromRouter<TRouter>;

/**
 * Create a typed HTTP client for flat HTTP router record
 *
 * @deprecated Prefer passing a CRPCHttpRouter type for nested access
 */
export function createHttpClient<
  TRouter extends HttpRouterRecord,
  TRoutes extends HttpRouteMap = HttpRouteMap,
>(opts: HttpClientOptions<TRoutes>): HttpClient<TRouter>;

export function createHttpClient<TRoutes extends HttpRouteMap = HttpRouteMap>(
  opts: HttpClientOptions<TRoutes>
): unknown {
  const { convexSiteUrl, routes, headers, fetch: customFetch, onError } = opts;

  return createRecursiveProxy({
    convexSiteUrl,
    routes,
    headers,
    fetch: customFetch,
    onError,
  });
}
