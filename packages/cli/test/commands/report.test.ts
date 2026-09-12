import { describe, expect, it } from 'vitest';
import { runReport } from '../../src/commands/report.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

describe('report', () => {
  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runReport(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('builds a status-only report (no Error section) for a registered launcher', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
        logLines: ['Local: http://localhost:5173/'],
      });

      const result = await runReport(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      const data = result.envelope.data as { name: string; report: string };
      expect(data.name).toBe('my-app');
      expect(data.report.startsWith('devlaunch report v1')).toBe(true);
      expect(data.report).not.toContain('Error:');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('copies to the clipboard instead of printing the report when --clipboard is set', async () => {
    const { ctx, adapterHandle, clipboard } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x/my-app' });

      const result = await runReport(ctx, { positionals: ['my-app'], flags: { clipboard: true } });
      expectValidEnvelope(result.envelope);
      expect(clipboard).toHaveLength(1);
      expect(clipboard[0]).toContain('devlaunch report v1');
      expect(result.plainLines).toEqual([expect.stringContaining('Copied the report')]);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('supports the vendored/internal form used by launcher.sh (--code/--project-dir/--log-file)', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runReport(ctx, {
        positionals: [],
        flags: {
          code: 'PORT_IN_USE',
          'project-dir': '/some/project',
          'log-file': '/nonexistent/log/file',
        },
      });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      const data = result.envelope.data as { report: string };
      expect(data.report).toContain('Error: PORT_IN_USE');
      expect(data.report).toContain('For coding agents:');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('rejects an unknown --code with a usage error', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runReport(ctx, { positionals: [], flags: { code: 'NOT_A_REAL_CODE' } });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(false);
      expect(result.exitCode).toBe(2);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
