import '../lib/http-polyfills';
import { registerRoutes } from 'better-convex/auth';
import { registerCRPCRoutes } from 'better-convex/server';
import { httpRouter } from 'convex/server';
import { router } from '../lib/crpc';
import { health } from '../routers/health';
import { todosRouter } from '../routers/todos';
import { httpAction } from './_generated/server';
import { createAuth } from './auth';

const http = httpRouter();

registerRoutes(http, createAuth);

export const appRouter = router({
  health,
  todos: todosRouter,
});

// Register routes to Convex httpRouter
registerCRPCRoutes(http, appRouter, {
  httpAction,
  cors: {
    allowedOrigins: [process.env.SITE_URL!],
    allowCredentials: true,
  },
});

export default http;
