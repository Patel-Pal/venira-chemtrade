import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against a running app + database seeded with `npm run seed`.
 * Start the app first (`npm run build && npm start`) or set E2E_BASE_URL.
 * Payment specs need Razorpay TEST keys; they are skipped otherwise. Never use live keys.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
