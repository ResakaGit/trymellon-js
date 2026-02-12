import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{ts,js}',
        '**/*.d.ts',
        'tests/',
        '**/*.test.{ts,js}',
        '**/*.spec.{ts,js}',
        'scripts/**',
        'src/angular/**',
      ],
      thresholds: {
        lines: 94,
        functions: 95,
        branches: 89,
        statements: 94,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx,js}', 'tests/**/*.{test,spec}.{ts,tsx,js}'],
    exclude: ['node_modules', 'dist', 'tests/adapters/angular.test.ts'],
  },
});
