import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/api',
      reporter: ['text', 'lcov'],
      include: ['src/services/**/*.ts', 'src/server.ts'],
      exclude: ['src/**/*.test.ts'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 75,
        branches: 70
      }
    }
  }
});
