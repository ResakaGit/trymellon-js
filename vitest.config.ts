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
        'e2e/**',
        'packages/**',
        'src/angular/**',
        'src/types.ts',
        'src/ui/index.ts',
        'src/ui/domain/validators/index.ts',
        'src/ui/domain/validators-attributes.ts',
        'src/ui/domain/contracts/attribute-contracts.ts',
        'src/ui/domain/contracts/types.ts',
        'src/ui/domain/attribute-contracts.ts',
      ],
      thresholds: {
        lines: 93,
        functions: 92,
        branches: 86,
        statements: 93,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx,js}', 'tests/**/*.{test,spec}.{ts,tsx,js}'],
    exclude: ['node_modules', 'dist', 'tests/adapters/angular.test.ts'],
  },
});
