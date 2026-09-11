import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: {
    // tsup's dts bundler (ts-morph/rollup-plugin-dts) mis-resolves TS project
    // references' "composite" mode across src/**/*.ts subfolders (TS6307).
    // composite is only needed for the root tsconfig's project references
    // (tsc --build), not for this standalone declaration bundle.
    compilerOptions: { composite: false, incremental: false },
  },
  clean: true,
  sourcemap: true,
  // core is pure logic: no runtime dependencies to bundle or externalize.
});
