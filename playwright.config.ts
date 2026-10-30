import { defineConfig } from '@playwright/test';

// Smoke tests drive the built app through Playwright's Electron support (run `npm run build` first).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // One app at a time on the small CI runners.
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
});
