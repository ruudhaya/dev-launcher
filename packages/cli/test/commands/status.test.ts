import { describe, expect, it } from 'vitest';
import { runStatus } from '../../src/commands/status.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

describe('status', () => {
  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runStatus(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(false);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('reports running: true with pid/port/url for a running launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
        pid: process.pid,
        port: 5173,
      });

      const result = await runStatus(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({
        name: 'my-app',
        running: true,
        pid: process.pid,
        port: 5173,
        url: 'http://localhost:5173/',
      });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('reports running: false with a null pid/url for a stopped launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
        pid: 999_999,
        port: 5173,
      });

      const result = await runStatus(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.data).toEqual({
        name: 'my-app',
        running: false,
        pid: null,
        port: 5173,
        url: null,
      });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('finds the launcher for the current directory when no name is given', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: ctx.cwd,
        pid: process.pid,
      });

      const result = await runStatus(ctx, { positionals: [], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect((result.envelope.data as { name: string }).name).toBe('my-app');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
