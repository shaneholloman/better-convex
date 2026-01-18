import type { GenericActionCtx, GenericDataModel } from 'convex/server';
import type { z } from 'zod';
import { CRPCError } from './error';
import type {
  CORSOptions,
  HttpHandlerOpts,
  HttpMethod,
  HttpProcedure,
  HttpProcedureBuilderDef,
  HttpRequestContext,
  ProcedureMeta,
} from './http-types';
import type {
  AnyMiddleware,
  MiddlewareBuilder,
  MiddlewareFunction,
  Overwrite,
  UnsetMarker,
} from './types';

// Extract path parameter names from a path template
export function extractPathParams(path: string): string[] {
  const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}

// Match URL pathname against a template and extract params
export function matchPathParams(
  template: string,
  pathname: string
): Record<string, string> | null {
  const templateParts = template.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  if (templateParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < templateParts.length; i++) {
    const templatePart = templateParts[i];
    const pathPart = pathParts[i];

    if (templatePart.startsWith(':')) {
      params[templatePart.slice(1)] = decodeURIComponent(pathPart);
    } else if (templatePart !== pathPart) {
      return null;
    }
  }

  return params;
}

// Convert CRPCError to HTTP Response with optional CORS headers
export function handleHttpError(
  error: unknown,
  request?: Request,
  cors?: CORSOptions | false
): Response {
  const headers = getCorsHeadersForResponse(request, cors);

  if (error instanceof CRPCError) {
    const statusMap: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_SUPPORTED: 405,
      CONFLICT: 409,
      UNPROCESSABLE_CONTENT: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
    };

    const status = statusMap[error.code] ?? 500;
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status, headers }
    );
  }

  console.error('Unhandled HTTP error:', error);
  return Response.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500, headers }
  );
}

/**
 * Get CORS headers for a response based on request origin and CORS config.
 * Returns undefined if CORS is disabled.
 */
function getCorsHeadersForResponse(
  request?: Request,
  cors?: CORSOptions | false
): HeadersInit | undefined {
  if (cors === false || !cors || !request) {
    return;
  }
  const origin = request.headers.get('Origin');
  return corsHeaders(origin, cors);
}

/**
 * Create a JSON response with CORS headers
 */
function createJsonResponse(
  body: unknown,
  request: Request,
  cors?: CORSOptions | false
): Response {
  const headers = getCorsHeadersForResponse(request, cors);
  return Response.json(body, { headers });
}

// Generate CORS headers
export function corsHeaders(
  origin: string | null,
  options: CORSOptions = {}
): HeadersInit {
  const {
    allowedOrigins = '*',
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    allowCredentials = false,
    maxAge = 86_400,
  } = options;

  let allowOrigin = '*';
  if (allowedOrigins !== '*' && origin) {
    if (allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = '';
    }
  } else if (allowedOrigins === '*') {
    allowOrigin = origin ?? '*';
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': String(maxAge),
    ...(allowCredentials && { 'Access-Control-Allow-Credentials': 'true' }),
  };
}

// Parse query parameters from URL
function parseQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// Type aliases for any-typed versions (used internally)
type AnyHttpProcedureBuilderDef = HttpProcedureBuilderDef<
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

/**
 * HttpProcedureBuilder - Fluent builder for HTTP endpoints
 *
 * Uses tRPC-style interface + factory pattern for proper generic type preservation:
 * - Interface declares full generics with explicit return types
 * - Factory function creates implementation objects
 * - This preserves literal types like 'GET' through method chains
 */
export interface HttpProcedureBuilder<
  TInitialCtx,
  TCtx,
  TInput extends UnsetMarker | z.ZodTypeAny = UnsetMarker,
  TOutput extends UnsetMarker | z.ZodTypeAny = UnsetMarker,
  TParams extends UnsetMarker | z.ZodTypeAny = UnsetMarker,
  TQuery extends UnsetMarker | z.ZodTypeAny = UnsetMarker,
  TMeta extends ProcedureMeta = ProcedureMeta,
  TRawMode extends boolean = false,
  TResponseMode extends boolean = false,
  TMethod extends HttpMethod = HttpMethod,
> {
  _def: HttpProcedureBuilderDef<
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TMethod
  >;

  /** Add middleware to the procedure */
  use<$ContextOverridesOut extends object>(
    middlewareOrBuilder:
      | MiddlewareFunction<TCtx, TMeta, UnsetMarker, $ContextOverridesOut>
      | MiddlewareBuilder<TInitialCtx, TMeta, $ContextOverridesOut>
  ): HttpProcedureBuilder<
    TInitialCtx,
    Overwrite<TCtx, $ContextOverridesOut>,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Set procedure metadata (shallow merged when chained) */
  meta(
    value: TMeta
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Define the route path and HTTP method */
  route<M extends HttpMethod>(
    path: string,
    method: M
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    M
  >;

  /** GET endpoint (Hono-style) */
  get(
    path: string
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    'GET'
  >;

  /** POST endpoint (Hono-style) */
  post(
    path: string
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    'POST'
  >;

  /** PUT endpoint (Hono-style) */
  put(
    path: string
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    'PUT'
  >;

  /** PATCH endpoint (Hono-style) */
  patch(
    path: string
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    'PATCH'
  >;

  /** DELETE endpoint (Hono-style) */
  delete(
    path: string
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    'DELETE'
  >;

  /** Define path parameter schema (for :param in path) */
  params<TSchema extends z.ZodTypeAny>(
    schema: TSchema
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TSchema,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Define query parameter schema (?key=value) */
  searchParams<TSchema extends z.ZodTypeAny>(
    schema: TSchema
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TSchema,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Define request body schema (for POST/PUT/PATCH) */
  input<TSchema extends z.ZodTypeAny>(
    schema: TSchema
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TSchema,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Define response schema */
  output<TSchema extends z.ZodTypeAny>(
    schema: TSchema
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TSchema,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Enable raw mode - skip body parsing, provide raw Request */
  raw(): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    true,
    TResponseMode,
    TMethod
  >;

  /** Enable response mode - return Response directly instead of JSON */
  response(): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    true,
    TMethod
  >;

  /** Set CORS config for this procedure. Pass false to disable CORS. */
  cors(
    options: CORSOptions | false
  ): HttpProcedureBuilder<
    TInitialCtx,
    TCtx,
    TInput,
    TOutput,
    TParams,
    TQuery,
    TMeta,
    TRawMode,
    TResponseMode,
    TMethod
  >;

  /** Define the handler for GET endpoints (maps to useQuery on client) */
  query<TResult>(
    handler: (
      opts: HttpHandlerOpts<TCtx, TInput, TParams, TQuery, TRawMode>
    ) => Promise<
      TResponseMode extends true
        ? Response
        : TOutput extends z.ZodTypeAny
          ? z.infer<TOutput>
          : TResult
    >
  ): HttpProcedure<TInput, TOutput, TParams, TQuery, TMethod>;

  /** Define the handler for POST/PUT/PATCH/DELETE endpoints (maps to useMutation on client) */
  mutation<TResult>(
    handler: (
      opts: HttpHandlerOpts<TCtx, TInput, TParams, TQuery, TRawMode>
    ) => Promise<
      TResponseMode extends true
        ? Response
        : TOutput extends z.ZodTypeAny
          ? z.infer<TOutput>
          : TResult
    >
  ): HttpProcedure<TInput, TOutput, TParams, TQuery, TMethod>;

  /** @deprecated Use .query() for GET endpoints or .mutation() for POST/PUT/PATCH/DELETE */
  action<TResult>(
    handler: (
      opts: HttpHandlerOpts<TCtx, TInput, TParams, TQuery, TRawMode>
    ) => Promise<
      TResponseMode extends true
        ? Response
        : TOutput extends z.ZodTypeAny
          ? z.infer<TOutput>
          : TResult
    >
  ): HttpProcedure<TInput, TOutput, TParams, TQuery, TMethod>;
}

// Any-typed builder for internal use
type AnyHttpProcedureBuilder = HttpProcedureBuilder<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

/** Factory function to create a new builder with merged def */
function createNewHttpBuilder(
  def1: AnyHttpProcedureBuilderDef,
  def2: Partial<AnyHttpProcedureBuilderDef>
): AnyHttpProcedureBuilder {
  return createHttpBuilder({ ...def1, ...def2 });
}

/** Internal method to create the HTTP procedure */
function createProcedure(
  def: AnyHttpProcedureBuilderDef,
  handler: (opts: any) => Promise<any>,
  _type: 'query' | 'mutation'
): HttpProcedure<any, any, any, any, any> {
  if (!def.route) {
    throw new Error(
      'Route must be defined before action. Use .route(path, method) first.'
    );
  }

  // Reference to access procedure._cors at runtime (set after procedure is created)
  let procedureRef: HttpProcedure<any, any, any, any, any>;

  const httpActionFn = (def.functionConfig.base as any)(
    async (
      convexCtx: GenericActionCtx<GenericDataModel>,
      request: Request
    ): Promise<Response> => {
      // Get CORS config (may be set by router registration)
      const cors = procedureRef?._cors;

      try {
        const url = new URL(request.url);

        // Extract path params
        const pathParams = matchPathParams(def.route!.path, url.pathname) ?? {};

        // Build request context
        const requestContext: HttpRequestContext = {
          request,
          headers: request.headers,
          url,
          pathParams,
        };

        // Create base context
        let ctx = def.functionConfig.createContext(convexCtx as any) as any &
          HttpRequestContext;
        Object.assign(ctx, requestContext);

        // Execute middlewares
        for (const middleware of def.middlewares) {
          const result = await middleware({
            ctx: ctx as any,
            next: async (opts?: any) => {
              if (opts?.ctx) {
                ctx = { ...ctx, ...opts.ctx };
              }
              return { ctx, marker: undefined as any };
            },
            meta: def.meta,
          });
          if (result?.ctx) {
            ctx = { ...ctx, ...(result.ctx as any) };
          }
        }

        // Raw mode - skip parsing
        if (def.rawMode) {
          const result = await handler({
            ctx,
            request,
          } as any);

          if (def.responseMode) {
            return result as Response;
          }

          const output = def.outputSchema
            ? def.outputSchema.parse(result as any)
            : result;
          return createJsonResponse(output, request, cors);
        }

        // Parse path params
        let parsedParams: unknown;
        if (def.paramsSchema) {
          parsedParams = def.paramsSchema.parse(pathParams as any);
        }

        // Parse query params
        let parsedQuery: unknown;
        if (def.querySchema) {
          const queryParams = parseQueryParams(url);
          parsedQuery = def.querySchema.parse(queryParams as any);
        }

        // Parse body for non-GET methods
        let parsedInput: unknown;
        if (def.inputSchema && request.method !== 'GET') {
          const contentType = request.headers.get('content-type') ?? '';
          let body: unknown;

          if (contentType.includes('application/json')) {
            body = await request.json();
          } else if (
            contentType.includes('application/x-www-form-urlencoded')
          ) {
            const formData = await request.formData();
            body = Object.fromEntries(formData.entries());
          } else {
            body = await request.json().catch(() => ({}));
          }

          parsedInput = def.inputSchema.parse(body as any);
        }

        // Build handler options
        const handlerOpts: any = {
          ctx,
          input: parsedInput,
        };

        if (parsedParams !== undefined) {
          handlerOpts.params = parsedParams;
        }

        if (parsedQuery !== undefined) {
          handlerOpts.query = parsedQuery;
        }

        const result = await handler(handlerOpts);

        // Response mode - return Response directly
        if (def.responseMode) {
          return result as Response;
        }

        // Validate and return JSON response with CORS headers
        const output = def.outputSchema
          ? def.outputSchema.parse(result as any)
          : result;
        return createJsonResponse(output, request, cors);
      } catch (error) {
        return handleHttpError(error, request, cors);
      }
    }
  );

  // Attach route metadata and def for client type inference
  const procedure = httpActionFn as HttpProcedure<any, any, any, any, any>;
  procedure.isHttp = true;
  procedure._crpcHttpRoute = def.route;
  procedure._def = {
    inputSchema: def.inputSchema,
    outputSchema: def.outputSchema,
    paramsSchema: def.paramsSchema,
    querySchema: def.querySchema,
  };
  // Store per-procedure CORS config (may be overridden by router)
  procedure._cors = def.cors;

  // Set reference for runtime access
  procedureRef = procedure;

  return procedure;
}

/** Create the builder implementation object */
function createHttpBuilder(
  def: AnyHttpProcedureBuilderDef
): AnyHttpProcedureBuilder {
  const builder: AnyHttpProcedureBuilder = {
    _def: def,

    use(middlewareOrBuilder: any) {
      const middlewares =
        '_middlewares' in middlewareOrBuilder
          ? middlewareOrBuilder._middlewares
          : [middlewareOrBuilder as AnyMiddleware];
      return createNewHttpBuilder(def, {
        middlewares: [...def.middlewares, ...middlewares],
      });
    },

    meta(value: any) {
      return createNewHttpBuilder(def, {
        meta: def.meta ? { ...def.meta, ...value } : value,
      });
    },

    route(path: string, method: HttpMethod) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method,
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    get(path: string) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method: 'GET',
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    post(path: string) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method: 'POST',
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    put(path: string) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method: 'PUT',
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    patch(path: string) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method: 'PATCH',
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    delete(path: string) {
      const pathParamNames = extractPathParams(path);
      return createNewHttpBuilder(def, {
        route: {
          path,
          method: 'DELETE',
          pathParamNames,
          usePathPrefix: pathParamNames.length > 0,
        },
      });
    },

    params(schema: any) {
      return createNewHttpBuilder(def, {
        paramsSchema: schema,
      });
    },

    searchParams(schema: any) {
      return createNewHttpBuilder(def, {
        querySchema: schema,
      });
    },

    input(schema: any) {
      return createNewHttpBuilder(def, {
        inputSchema: schema,
      });
    },

    output(schema: any) {
      return createNewHttpBuilder(def, {
        outputSchema: schema,
      });
    },

    raw() {
      return createNewHttpBuilder(def, {
        rawMode: true,
      });
    },

    response() {
      return createNewHttpBuilder(def, {
        responseMode: true,
      });
    },

    cors(options: CORSOptions | false) {
      return createNewHttpBuilder(def, {
        cors: options,
      });
    },

    query(handler: any) {
      return createProcedure(def, handler, 'query');
    },

    mutation(handler: any) {
      return createProcedure(def, handler, 'mutation');
    },

    action(handler: any) {
      return createProcedure(def, handler, 'query');
    },
  };

  return builder;
}

/**
 * Create initial HttpProcedureBuilder
 */
export function createHttpProcedureBuilder<
  TCtx,
  TMeta extends ProcedureMeta,
>(config: {
  base: HttpProcedureBuilderDef<
    TCtx,
    UnsetMarker,
    UnsetMarker,
    UnsetMarker,
    UnsetMarker,
    TMeta,
    HttpMethod
  >['functionConfig']['base'];
  createContext: (ctx: GenericActionCtx<GenericDataModel>) => TCtx;
  meta: TMeta;
}): HttpProcedureBuilder<
  TCtx,
  TCtx,
  UnsetMarker,
  UnsetMarker,
  UnsetMarker,
  UnsetMarker,
  TMeta,
  false,
  false,
  HttpMethod
> {
  return createHttpBuilder({
    middlewares: [],
    meta: config.meta,
    functionConfig: {
      base: config.base,
      createContext: config.createContext,
    },
  }) as HttpProcedureBuilder<
    TCtx,
    TCtx,
    UnsetMarker,
    UnsetMarker,
    UnsetMarker,
    UnsetMarker,
    TMeta,
    false,
    false,
    HttpMethod
  >;
}
