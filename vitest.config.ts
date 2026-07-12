import { defineConfig } from 'vitest/config';

// Exercise explicit site time-zone handling instead of inheriting a developer machine's zone.
process.env.TZ = 'UTC';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
