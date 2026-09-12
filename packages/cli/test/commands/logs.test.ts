import { describe, expect, it } from 'vitest';
import { runLogs } from '../../src/commands/logs.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

describe('logs', () => {
  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runLogs(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('returns an empty line list when there is no log file yet', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x' });
      const result = await runLogs(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.data).toEqual({ name: 'my-app', lines: [] });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('returns the tail of the log, defaulting to 80 lines', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const allLines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x',
        logLines: allLines,
      });

      const result = await runLogs(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      const data = result.envelope.data as { lines: string[] };
      expect(data.lines).toHaveLength(80);
      expect(data.lines[0]).toBe('line 21');
      expect(data.lines[79]).toBe('line 100');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('honors --tail N', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x',
        logLines: ['a', 'b', 'c', 'd'],
      });

      const result = await runLogs(ctx, { positionals: ['my-app'], flags: { tail: '2' } });
      expectValidEnvelope(result.envelope);
      expect((result.envelope.data as { lines: string[] }).lines).toEqual(['c', 'd']);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('rejects a non-numeric --tail with a usage error', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runLogs(ctx, { positionals: ['my-app'], flags: { tail: 'lots' } });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(false);
      expect(result.exitCode).toBe(2);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('redacts secret-shaped values in log lines', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x',
        logLines: ['Authorization: Bearer abc123.def456'],
      });

      const result = await runLogs(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      const data = result.envelope.data as { lines: string[] };
      expect(data.lines[0]).toContain('[REDACTED]');
      expect(data.lines[0]).not.toContain('abc123.def456');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
