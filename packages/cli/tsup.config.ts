import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  // Bundle the internal packages into the single published file so the shipped
  // package has zero runtime dependencies (see CLAUDE.md).
  noExternal: [/^@devlaunch\//],
  banner: { js: '#!/usr/bin/env node' },
  dts: false,
  clean: true,
  minify: false,
  sourcemap: true,
});
