import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Config for running only Angular adapter tests (excluded from main run due to ESM/Angular load).
 * Resolves @trymellon/js/angular to dist/angular.js so Vitest loads the built bundle instead of source.
 * Usage: npm run build && npx vitest run --config vitest.angular.config.ts
 */
export default defineConfig({
  resolve: {
    alias: {
      '@trymellon/js/angular': path.resolve(process.cwd(), 'dist/angular.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./tests/setup-angular.ts', './tests/setup.ts'],
    include: ['tests/adapters/angular.test.ts'],
    exclude: [],
  },
});
