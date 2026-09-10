import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.test.ts'],
    // e2e drives real processes and the filesystem; give it room and no parallelism.
    testTimeout: 120_000,
    pool: 'forks',
    fileParallelism: false,
  },
});
