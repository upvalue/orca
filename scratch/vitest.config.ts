import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['api/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
