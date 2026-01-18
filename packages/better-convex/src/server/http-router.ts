import type { HttpRouter as ConvexHttpRouter } from 'convex/server';
import { corsHeaders } from './http-builder';
import type {
  CORSOptions,
  CRPCRouterOptions,
  HttpActionConstructor,
  HttpProcedure,
  HttpRouteDefinition,
} from './http-types';

// =============================================================================
// Router Types (tRPC-style)
// =============================================================================

/**
 * Recursive router record - can contain procedures or nested routers
 */
export interface HttpRouterRecord {
  [key: string]: HttpProcedure | HttpRouterRecord | CRPCHttpRouter<any>;
}

/**
 * Router definition - stores both flat procedures and hierarchical record
 */
export interface HttpRouterDef<TRecord extends HttpRouterRecord> {
  router: true;
  /** Flat map with dot-notation keys (e.g., "todos.get") for lookup */
  procedures: Record<string, HttpProcedure>;
  /** Hierarchical structure for type inference */
  record: TRecord;
}

/**
 * HTTP Router - like tRPC's BuiltRouter
 */
export interface CRPCHttpRouter<TRecord extends HttpRouterRecord> {
  _def: HttpRouterDef<TRecord>;
}

/**
 * Check if an export is a cRPC HTTP procedure
 * Note: Procedures are functions with attached properties, not plain objects
 */
function isCRPCHttpProcedure(value: unknown): value is HttpProcedure {
  return (
    typeof value === 'function' &&
    'isHttp' in value &&
    (value as any).isHttp === true &&
    '_crpcHttpRoute' in value
  );
}

/**
 * Check if a value is a cRPC HTTP router
 */
function isCRPCHttpRouter(value: unknown): value is CRPCHttpRouter<any> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_def' in value &&
    (value as any)._def?.router === true
  );
}

// =============================================================================
// Router Factory (tRPC-style c.router)
// =============================================================================

/**
 * Create a router factory function (like tRPC's createRouterFactory)
 *
 * @example
 * ```ts
 * // In crpc.ts
 * export const router = c.router;
 *
 * // In api/todos.ts
 * export const todosRouter = router({
 *   get: publicHttpAction.route('/api/todos/:id', 'GET')...,
 *   create: authHttpAction.route('/api/todos', 'POST')...,
 * });
 *
 * // In http.ts
 * export const appRouter = router({
 *   todos: todosRouter,
 *   health,
 * });
 * export type AppRouter = typeof appRouter;
 * ```
 */
export function createHttpRouterFactory() {
  return function router<TRecord extends HttpRouterRecord>(
    record: TRecord
  ): CRPCHttpRouter<TRecord> {
    const procedures: Record<string, HttpProcedure> = {};

    /**
     * Recursively flatten procedures with dot-notation paths
     * Like tRPC's step() function in router.ts
     */
    function step(obj: HttpRouterRecord, path: string[] = []) {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = [...path, key];
        const pathKey = newPath.join('.');

        if (isCRPCHttpProcedure(value)) {
          // Store procedure with flattened path
          procedures[pathKey] = value;
        } else if (isCRPCHttpRouter(value)) {
          // Nested router - flatten its procedures
          for (const [procPath, proc] of Object.entries(
            value._def.procedures
          )) {
            procedures[`${pathKey}.${procPath}`] = proc;
          }
        } else if (typeof value === 'object' && value !== null) {
          // Plain object - recurse
          step(value as HttpRouterRecord, newPath);
        }
      }
    }

    step(record);

    return {
      _def: {
        router: true,
        procedures,
        record,
      },
    };
  };
}

/**
 * Register a cRPC HTTP router with a Convex httpRouter
 *
 * @example
 * ```ts
 * const http = httpRouter();
 *
 * registerCRPCRoutes(http, appRouter, {
 *   cors: { allowedOrigins: '*' },
 * });
 *
 * export default http;
 * ```
 */
export function registerCRPCRoutes<TRecord extends HttpRouterRecord>(
  http: ConvexHttpRouter,
  router: CRPCHttpRouter<TRecord>,
  options: CRPCRouterOptions = {}
): void {
  const { cors, httpAction } = options;
  const registeredPrefixes = new Set<string>();

  // Collect all routes for CORS preflight handling
  const routes: { route: HttpRouteDefinition; handler: HttpProcedure }[] = [];

  for (const procedure of Object.values(router._def.procedures)) {
    // Propagate global CORS to procedures that don't have explicit config
    if (procedure._cors === undefined && cors) {
      procedure._cors = cors;
    }
    routes.push({ route: procedure._crpcHttpRoute, handler: procedure });
  }

  // Register CORS preflight handler if cors is enabled
  if (cors) {
    const optionsPaths = new Set<string>();

    for (const { route } of routes) {
      if (route.usePathPrefix) {
        const basePath = getBasePath(route.path);
        optionsPaths.add(`${basePath}*`);
      } else {
        optionsPaths.add(route.path);
      }
    }

    for (const path of optionsPaths) {
      const isPrefix = path.endsWith('*');

      if (isPrefix) {
        const prefixPath = path.slice(0, -1); // Remove * but keep trailing /
        http.route({
          pathPrefix: prefixPath,
          method: 'OPTIONS',
          handler: createCorsHandler(cors, httpAction),
        });
      } else {
        http.route({
          path,
          method: 'OPTIONS',
          handler: createCorsHandler(cors, httpAction),
        });
      }
    }
  }

  // Register each procedure
  // Note: CORS headers on responses must be added by procedures themselves
  // because Convex doesn't expose handler invocation for wrapping
  for (const { route, handler } of routes) {
    if (route.usePathPrefix) {
      const basePath = getBasePath(route.path);
      const key = `${basePath}:${route.method}`;

      if (!registeredPrefixes.has(key)) {
        registeredPrefixes.add(key);
        http.route({
          pathPrefix: basePath,
          method: route.method,
          handler,
        });
      }
    } else {
      http.route({
        path: route.path,
        method: route.method,
        handler,
      });
    }
  }
}

// =============================================================================
// Legacy API (for backwards compatibility)
// =============================================================================

/**
 * Get the base path for prefix matching (remove :params)
 * Returns path ending with / as required by Convex httpRouter
 */
function getBasePath(path: string): string {
  // Find where the first param starts and truncate
  const parts = path.split('/');
  const baseParts: string[] = [];

  for (const part of parts) {
    if (part.startsWith(':')) {
      break;
    }
    baseParts.push(part);
  }

  const result = baseParts.join('/');
  // Convex pathPrefix must end with /
  return result.endsWith('/') ? result : `${result}/`;
}

/**
 * Register cRPC HTTP procedures with a Convex httpRouter
 *
 * @example
 * ```ts
 * import { httpRouter } from 'convex/server';
 * import { createCRPCRouter } from 'better-convex/server';
 * import * as users from './api/users';
 * import * as webhooks from './api/webhooks';
 *
 * const http = httpRouter();
 *
 * createCRPCRouter(http, {
 *   ...users,
 *   ...webhooks,
 * }, {
 *   cors: {
 *     allowedOrigins: [process.env.CLIENT_ORIGIN!],
 *     allowCredentials: true,
 *   },
 * });
 *
 * export default http;
 * ```
 */
export function createCRPCRouter<TProcedures extends Record<string, unknown>>(
  http: ConvexHttpRouter,
  procedures: TProcedures,
  options: CRPCRouterOptions = {}
): TProcedures {
  const { cors } = options;
  const registeredPrefixes = new Set<string>();

  // Collect all routes for CORS preflight handling
  const routes: { route: HttpRouteDefinition; handler: HttpProcedure }[] = [];

  // Find all cRPC HTTP procedures
  for (const [, value] of Object.entries(procedures)) {
    if (isCRPCHttpProcedure(value)) {
      // Propagate global CORS to procedures that don't have explicit config
      if (value._cors === undefined && cors) {
        value._cors = cors;
      }
      routes.push({ route: value._crpcHttpRoute, handler: value });
    }
  }

  // Register CORS preflight handler if cors is enabled
  if (cors) {
    // Get unique paths for OPTIONS handlers
    const optionsPaths = new Set<string>();

    for (const { route } of routes) {
      if (route.usePathPrefix) {
        optionsPaths.add(`${getBasePath(route.path)}/*`);
      } else {
        optionsPaths.add(route.path);
      }
    }

    // Register OPTIONS handlers
    for (const path of optionsPaths) {
      const isPrefix = path.endsWith('/*');

      if (isPrefix) {
        http.route({
          pathPrefix: path.slice(0, -1), // Remove * but keep trailing /
          method: 'OPTIONS',
          handler: createCorsHandler(cors),
        });
      } else {
        http.route({
          path,
          method: 'OPTIONS',
          handler: createCorsHandler(cors),
        });
      }
    }
  }

  // Register each procedure
  // Note: CORS headers on responses must be added by procedures themselves
  // because Convex doesn't expose handler invocation for wrapping
  for (const { route, handler } of routes) {
    if (route.usePathPrefix) {
      const basePath = getBasePath(route.path);

      // Only register prefix once per path/method combo
      const key = `${basePath}:${route.method}`;
      if (!registeredPrefixes.has(key)) {
        registeredPrefixes.add(key);
        http.route({
          pathPrefix: basePath,
          method: route.method,
          handler,
        });
      }
    } else {
      http.route({
        path: route.path,
        method: route.method,
        handler,
      });
    }
  }

  // Return procedures for type inference on client
  return procedures;
}

/**
 * Create a CORS preflight handler using the actual httpAction function
 *
 * Note: httpAction is required - Convex doesn't provide a way to create
 * HTTP handlers without it.
 */
function createCorsHandler(
  cors: CORSOptions,
  httpActionFn?: HttpActionConstructor
): any {
  if (!httpActionFn) {
    console.warn(
      'CORS OPTIONS handler requires httpAction to be passed in options. ' +
        'Preflight requests may not work correctly.'
    );
    // Return a minimal handler - won't work properly but prevents crash
    const handler = function corsHandler() {} as any;
    handler.isHttp = true;
    return handler;
  }

  return httpActionFn(async (_ctx, request) => {
    const origin = request.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin, cors),
    });
  });
}

/**
 * Helper to merge multiple procedure modules
 *
 * @example
 * ```ts
 * import * as users from './api/users';
 * import * as posts from './api/posts';
 *
 * createCRPCRouter(http, mergeProcedures(users, posts));
 * ```
 */
export function mergeProcedures(
  ...modules: Record<string, unknown>[]
): Record<string, unknown> {
  return Object.assign({}, ...modules);
}

/**
 * Extract route map from procedures for client runtime
 *
 * @example
 * ```ts
 * const procedures = createCRPCRouter(http, { getUser, createUser });
 * export const httpRoutes = extractRouteMap(procedures);
 * export type HttpRouter = typeof procedures;
 * ```
 */
export function extractRouteMap<T extends Record<string, HttpProcedure>>(
  procedures: T
): { [K in keyof T]: { path: string; method: string } } {
  const result: Record<string, { path: string; method: string }> = {};

  for (const [name, proc] of Object.entries(procedures)) {
    if (isCRPCHttpProcedure(proc)) {
      result[name] = {
        path: proc._crpcHttpRoute.path,
        method: proc._crpcHttpRoute.method,
      };
    }
  }

  return result as { [K in keyof T]: { path: string; method: string } };
}
