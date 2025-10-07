import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:8080'
  },
  webServer: {
    command: 'pnpm dev',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});
