import { describe, expect, it } from 'vitest';
import { runOpen } from '../../src/commands/open.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

describe('open', () => {
  it('reports LAUNCHER_NOT_FOUND (exit 3) for an unknown name', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runOpen(ctx, { positionals: ['nope'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(false);
      expect(result.envelope.code).toBe('LAUNCHER_NOT_FOUND');
      expect(result.exitCode).toBe(3);
      expect(adapterHandle.calls.opened).toEqual([]);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('opens the registered bundle path, like double-clicking it', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const { bundlePath } = await registerLauncher(adapterHandle, {
        name: 'my-app',
        projectDir: '/x/my-app',
      });

      const result = await runOpen(ctx, { positionals: ['my-app'], flags: {} });
      expectValidEnvelope(result.envelope);
      expect(result.envelope.ok).toBe(true);
      expect(result.envelope.data).toEqual({ name: 'my-app' });
      expect(adapterHandle.calls.opened).toEqual([bundlePath]);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
