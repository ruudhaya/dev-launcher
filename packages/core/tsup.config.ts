import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  dts: true,
  clean: true,
  sourcemap: true,
  // core is pure logic: no runtime dependencies to bundle or externalize.
});
