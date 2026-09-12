import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRegistry } from '@devlaunch/core';
import { describe, expect, it } from 'vitest';
import { runInit } from '../../src/commands/init.js';
import { buildTestContext } from '../context-helper.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const viteReactFixture = join(repoRoot, 'examples/vite-react');

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe('init', () => {
  it('rejects an invalid --mode with a usage error', async () => {
    const { ctx, adapterHandle } = await buildTestContext({ cwd: viteReactFixture });
    try {
      const result = await runInit(ctx, { positionals: [], flags: { mode: 'sideways' } });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(false);
      expect(result.exitCode).toBe(2);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('generates a real launcher bundle for a real fixture project', async () => {
    const { ctx, adapterHandle } = await buildTestContext({ cwd: viteReactFixture });
    try {
      const result = await runInit(ctx, { positionals: [], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);

      const data = result.envelope.data as {
        launchers: { name: string; bundlePath: string; replacingInPlace: boolean }[];
      };
      expect(data.launchers).toHaveLength(1);
      const launcher = data.launchers[0];
      if (!launcher) throw new Error('expected a launcher entry');

      expect(await exists(join(launcher.bundlePath, 'Contents/MacOS/launcher'))).toBe(true);
      expect(await exists(join(launcher.bundlePath, 'Contents/Resources/launcher.env'))).toBe(true);
      expect(launcher.replacingInPlace).toBe(false);

      const registry = await readRegistry(ctx.adapter);
      expect(registry[launcher.name]).toMatchObject({ projectDir: viteReactFixture });
      expect(adapterHandle.calls.spotlight).toContain(launcher.bundlePath);

      expect(result.plainLines?.some((line) => line.includes('⌘ Space'))).toBe(true);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('--dry-run reports the plan without writing anything', async () => {
    const { ctx, adapterHandle } = await buildTestContext({ cwd: viteReactFixture, dryRun: true });
    try {
      const result = await runInit(ctx, { positionals: [], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.message).toContain('Would generate');

      const data = result.envelope.data as { launchers: { bundlePath: string }[] };
      const [launcher] = data.launchers;
      if (!launcher) throw new Error('expected a launcher entry');
      expect(await exists(launcher.bundlePath)).toBe(false);
      expect(await readRegistry(ctx.adapter)).toEqual({});
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('replaces the same project in place on a second init instead of colliding', async () => {
    const { ctx, adapterHandle } = await buildTestContext({ cwd: viteReactFixture });
    try {
      await runInit(ctx, { positionals: [], flags: {} });
      const second = await runInit(ctx, { positionals: [], flags: {} });
      expectValidEnvelope(second.envelope);
      expect(second.envelope.ok).toBe(true);

      const data = second.envelope.data as { launchers: { replacingInPlace: boolean }[] };
      const [launcher] = data.launchers;
      if (!launcher) throw new Error('expected a launcher entry');
      expect(launcher.replacingInPlace).toBe(true);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('a monorepo-style array launcher config requires --name to pick one app', async () => {
    const projectDir = await mkdtemp(join(tmpdir(), 'devlaunch-init-mono-'));
    try {
      await writeFile(
        join(projectDir, 'package.json'),
        JSON.stringify({
          name: 'mono-root',
          scripts: { dev: 'vite', start: 'node server.js' },
          launcher: [
            { name: 'web', script: 'dev', port: 4001 },
            { name: 'api', script: 'start', port: 4002 },
          ],
        }),
        'utf8',
      );

      const { ctx, adapterHandle } = await buildTestContext({ cwd: projectDir });
      try {
        const ambiguous = await runInit(ctx, { positionals: [], flags: {} });
        expectValidEnvelope(ambiguous.envelope);
        expect(ambiguous.envelope.ok).toBe(false);
        expect(ambiguous.exitCode).toBe(3);

        const picked = await runInit(ctx, { positionals: [], flags: { name: 'api' } });
        expectValidEnvelope(picked.envelope);
        expect(picked.envelope.ok).toBe(true);
        const data = picked.envelope.data as { launchers: { name: string }[] };
        expect(data.launchers).toHaveLength(1);
        expect(data.launchers[0]?.name).toBe('api');
      } finally {
        await cleanupTestAdapter(adapterHandle);
      }
    } finally {
      await rm(projectDir, { recursive: true, force: true });
    }
  });
});
