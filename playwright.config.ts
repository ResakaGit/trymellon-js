import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests: load SDK in browser and verify public API.
 * Run after build: npm run build && npm run test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3123',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx serve . -p 3123',
    url: 'http://127.0.0.1:3123',
    reuseExistingServer: !process.env.CI,
  },
});
