import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runStop } from '../../src/commands/stop.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

/** A real, harmless child process to stop for real — `sleep` never exits on its own. */
function spawnSleeper(): number {
  const proc = spawn('sleep', ['60'], { stdio: 'ignore' });
  const pid = proc.pid;
  if (pid === undefined) throw new Error('failed to spawn a test process');
  return pid;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe('stop', () => {
  const spawned: number[] = [];
  afterEach(() => {
    while (spawned.length > 0) {
      const pid = spawned.pop();
      if (pid !== undefined && isAlive(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // already gone
        }
      }
    }
  });

  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runStop(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('is a no-op, not an error, on an already-stopped launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x', pid: 999_999 });
      const result = await runStop(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({ stopped: [] });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('kills a running process and removes its pid file', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    const pid = spawnSleeper();
    spawned.push(pid);
    try {
      const { slug } = await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x',
        pid,
      });
      expect(isAlive(pid)).toBe(true);

      const result = await runStop(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.data).toEqual({ stopped: ['my-app'] });

      // killTree's signal is async-delivered; give the OS a moment.
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(isAlive(pid)).toBe(false);

      await expect(
        readFile(join(ctx.adapter.runDirectory(), `${slug}.pid`), 'utf8'),
      ).rejects.toThrow();
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('--dry-run reports what would stop without killing anything', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    const dryCtx = { ...ctx, dryRun: true };
    const pid = spawnSleeper();
    spawned.push(pid);
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x', pid });

      const result = await runStop(dryCtx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.data).toEqual({ stopped: ['my-app'] });
      expect(result.envelope.message).toContain('Would stop');
      expect(isAlive(pid)).toBe(true);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('--all stops every running launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    const pidA = spawnSleeper();
    const pidB = spawnSleeper();
    spawned.push(pidA, pidB);
    try {
      await registerLauncher(adapterHandle, { name: 'app-a', projectDir: '/x/a', pid: pidA });
      await registerLauncher(adapterHandle, { name: 'app-b', projectDir: '/x/b', pid: pidB });
      await registerLauncher(adapterHandle, { name: 'app-c', projectDir: '/x/c', pid: 999_999 });

      const result = await runStop(ctx, { positionals: [], flags: { all: true } });
      expectValidEnvelope(result.envelope);
      expect((result.envelope.data as { stopped: string[] }).stopped.sort()).toEqual([
        'app-a',
        'app-b',
      ]);

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(isAlive(pidA)).toBe(false);
      expect(isAlive(pidB)).toBe(false);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
