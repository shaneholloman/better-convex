import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'better-convex/orm': path.resolve(
        __dirname,
        'packages/better-convex/src/orm/index.ts'
      ),
    },
  },
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
    include: [
      'convex/**/*.test.ts',
      'convex/**/*.test.tsx',
      'test/**/*.test.ts',
      'test/**/*.test.tsx',
    ],
    exclude: ['**/node_modules/**', '**/tmp/**'],
  },
});
