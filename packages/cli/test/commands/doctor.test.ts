import { describe, expect, it } from 'vitest';
import { runDoctor } from '../../src/commands/doctor.js';
import { buildTestContext } from '../context-helper.js';
import { registerLauncher } from '../fixtures.js';
import { expectValidEnvelope } from '../schema.js';
import { cleanupTestAdapter } from '../test-adapter.js';

interface DoctorCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly code: string | null;
  readonly hint: string | null;
}

describe('doctor', () => {
  it('runs a battery of checks and always validates against the envelope schema', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      const result = await runDoctor(ctx);
      expectValidEnvelope(result.envelope);

      const data = result.envelope.data as { checks: DoctorCheck[] };
      expect(data.checks.length).toBeGreaterThan(0);
      for (const check of data.checks) {
        expect(typeof check.name).toBe('string');
        expect(typeof check.ok).toBe('boolean');
      }
      // Exit code follows whether every check passed, per docs/agent-contract.md.
      const allOk = data.checks.every((c) => c.ok);
      expect(result.envelope.ok).toBe(allOk);
      expect(result.exitCode).toBe(allOk ? 0 : 4);
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('flags a registered launcher whose bundle has been deleted as stale', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, {
        name: 'ghost',
        projectDir: '/x/ghost',
        writeBundleDir: false,
      });

      const result = await runDoctor(ctx);
      expectValidEnvelope(result.envelope);
      const data = result.envelope.data as { checks: DoctorCheck[] };
      const staleCheck = data.checks.find((c) => c.name === 'stale-launchers');
      expect(staleCheck?.ok).toBe(false);
      expect(staleCheck?.hint).toContain('ghost');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });

  it('does not fail doctor over a stale pid file — it is self-healing, so just informational', async () => {
    const { ctx, adapterHandle } = await buildTestContext();
    try {
      await registerLauncher(adapterHandle, { name: 'my-app', projectDir: '/x', pid: 999_999 });

      const result = await runDoctor(ctx);
      expectValidEnvelope(result.envelope);
      const data = result.envelope.data as { checks: DoctorCheck[] };
      const staleCheck = data.checks.find((c) => c.name === 'stale-pid-files');
      expect(staleCheck?.ok).toBe(true);
      expect(staleCheck?.hint).toContain('my-app');
    } finally {
      await cleanupTestAdapter(adapterHandle);
    }
  });
});
