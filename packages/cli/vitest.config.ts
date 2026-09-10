import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only. The e2e suite runs via `pnpm test:e2e`
    // (vitest.e2e.config.ts) so it is not part of the fast unit run.
    include: ['test/**/*.test.ts'],
    exclude: ['test/e2e/**'],
  },
});
