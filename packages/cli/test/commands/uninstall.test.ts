import { readFile, stat } from 'node:fs/promises';
import { readRegistry } from '@devlaunch/core';
import { describe, expect, it } from 'vitest';
import { runUninstall } from '../../src/commands/uninstall.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe('uninstall', () => {
  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runUninstall(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('deletes the bundle, forgets the registry entry, and reports removed', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const { bundlePath } = await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
        logLines: ['hello'],
      });
      expect(await exists(bundlePath)).toBe(true);

      const result = await runUninstall(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({ removed: ['my-app'] });

      expect(await exists(bundlePath)).toBe(false);
      const registry = await readRegistry(ctx.adapter);
      expect(registry['my-app']).toBeUndefined();
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('stops a running launcher before removing it', async () => {
    const { spawn } = await import('node:child_process');
    const proc = spawn('sleep', ['60'], { stdio: 'ignore' });
    const pid = proc.pid as number;

    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x/my-app', pid });

      await runUninstall(ctx, { positionals: ['my-app'], flags: {} });

      await new Promise((resolve) => setTimeout(resolve, 200));
      let alive = true;
      try {
        process.kill(pid, 0);
      } catch {
        alive = false;
      }
      expect(alive).toBe(false);
    } finally {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // already gone
      }
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('--dry-run reports what would be removed without deleting anything', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    const dryCtx = { ...ctx, dryRun: true };
    try {
      const { bundlePath } = await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
      });

      const result = await runUninstall(dryCtx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.data).toEqual({ removed: ['my-app'] });
      expect(result.envelope.message).toContain('Would remove');

      expect(await exists(bundlePath)).toBe(true);
      const registry = await readRegistry(ctx.adapter);
      expect(registry['my-app']).toBeDefined();
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('--all removes every registered launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'app-a', projectDir: '/x/a' });
      await registerLauncher(adapterHandle, { name: 'app-b', projectDir: '/x/b' });

      const result = await runUninstall(ctx, { positionals: [], flags: { all: true } });
      expectValidEnvelope(result.envelope);
      expect((result.envelope.data as { removed: string[] }).removed.sort()).toEqual([
        'app-a',
        'app-b',
      ]);
      expect(await readRegistry(ctx.adapter)).toEqual({});
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('does not error uninstalling a launcher whose bundle is already gone', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'ghost',
        projectDir: '/x/ghost',
        writeBundleDir: false,
      });

      const result = await runUninstall(ctx, { positionals: ['ghost'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({ removed: ['ghost'] });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('leaves the pid file gone after removal', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const { slug } = await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
        pid: 999_999,
      });
      const pidFile = `${ctx.adapter.runDirectory()}/${slug}.pid`;

      await runUninstall(ctx, { positionals: ['my-app'], flags: {} });

      await expect(readFile(pidFile, 'utf8')).rejects.toThrow();
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
