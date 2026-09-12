import { describe, expect, it } from 'vitest';
import { runList } from '../../src/commands/list.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

describe('list', () => {
  it('reports no launchers when the registry is empty', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runList(ctx);
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({ launchers: [] });
      expect(result.exitCode).toBe(0);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('lists registered launchers with their running state', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'Running App',
        projectDir: '/x/running',
        pid: process.pid,
      });
      await registerLauncher(adapterHandle, {
        name: 'Stopped App',
        projectDir: '/x/stopped',
        pid: 999_999,
      });

      const result = await runList(ctx);
      expectValidEnvelope(result.envelope);
      const data = result.envelope.data as {
        launchers: { name: string; projectDir: string; running: boolean }[];
      };
      const byName = Object.fromEntries(data.launchers.map((l) => [l.name, l]));
      expect(byName['Running App']).toMatchObject({ projectDir: '/x/running', running: true });
      expect(byName['Stopped App']).toMatchObject({ projectDir: '/x/stopped', running: false });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('treats a launcher whose bundle is gone as not running, not a crash', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'Ghost App',
        projectDir: '/x/ghost',
        writeBundleDir: false,
      });

      const result = await runList(ctx);
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      const data = result.envelope.data as { launchers: { name: string; running: boolean }[] };
      expect(data.launchers[0]).toMatchObject({ name: 'Ghost App', running: false });
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
