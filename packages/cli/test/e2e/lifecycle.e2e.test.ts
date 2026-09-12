import { execFile } from 'node:child_process';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const cliEntry = join(repoRoot, 'packages/cli/dist/index.js');
const examplesDir = join(repoRoot, 'examples');

interface Envelope {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly code: string;
  readonly message: string;
  readonly hint: string | null;
  readonly data: unknown;
}

interface CliResult {
  readonly envelope: Envelope;
  readonly exitCode: number;
}

/**
 * Drives the real, built `devlaunch` binary as a real subprocess — the
 * whole point of this suite is exercising the actual dist/index.js an agent
 * or a person would run, not the command functions directly (see
 * test/commands/*.test.ts for that level). HOME is overridden to a fresh
 * temp directory per test so this never touches the real machine's
 * ~/Applications or ~/Library/Application Support/devlaunch.
 */
async function runCli(args: readonly string[], homeDir: string): Promise<CliResult> {
  try {
    const { stdout } = await execFileAsync('node', [cliEntry, ...args, '--json'], {
      env: { ...process.env, HOME: homeDir },
    });
    return { envelope: JSON.parse(stdout) as Envelope, exitCode: 0 };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string };
    return {
      envelope: JSON.parse(failure.stdout ?? 'null') as Envelope,
      exitCode: failure.code ?? 1,
    };
  }
}

let homeDir: string;

describe('devlaunch CLI — real lifecycle (macOS e2e)', () => {
  beforeAll(async () => {
    await expect(
      stat(cliEntry),
      'run `pnpm --filter devlaunch build` before the e2e suite',
    ).resolves.toBeDefined();
  });

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'devlaunch-e2e-home-'));
  });

  afterEach(async () => {
    await rm(homeDir, { recursive: true, force: true });
  });

  it('init generates a real bundle; list/status see it; uninstall leaves nothing behind', async () => {
    const projectDir = join(examplesDir, 'vite-react');

    const init = await runCli(['init', '--cwd', projectDir, '--yes'], homeDir);
    expect(init.exitCode).toBe(0);
    expect(init.envelope.ok).toBe(true);
    const initData = init.envelope.data as { launchers: { name: string; bundlePath: string }[] };
    expect(initData.launchers).toHaveLength(1);
    const launcher = initData.launchers[0];
    if (!launcher) throw new Error('expected a launcher entry');

    expect(await readdir(join(launcher.bundlePath, 'Contents/MacOS'))).toContain('launcher');

    const list = await runCli(['list'], homeDir);
    expect(list.exitCode).toBe(0);
    const listData = list.envelope.data as { launchers: { name: string }[] };
    expect(listData.launchers.map((l) => l.name)).toContain(launcher.name);

    const status = await runCli(['status', launcher.name], homeDir);
    expect(status.exitCode).toBe(0);
    expect((status.envelope.data as { running: boolean }).running).toBe(false);

    const uninstall = await runCli(['uninstall', launcher.name], homeDir);
    expect(uninstall.exitCode).toBe(0);
    expect((uninstall.envelope.data as { removed: string[] }).removed).toEqual([launcher.name]);

    await expect(stat(launcher.bundlePath)).rejects.toThrow();
    const listAfter = await runCli(['list'], homeDir);
    expect((listAfter.envelope.data as { launchers: unknown[] }).launchers).toEqual([]);
  }, 30_000);

  it('init succeeds on every "examples/broken/*" fixture — they only fail at dev-server runtime, not at init', async () => {
    const brokenDir = join(examplesDir, 'broken');
    const fixtures = await readdir(brokenDir);
    expect(fixtures.length).toBeGreaterThan(0);

    for (const fixture of fixtures) {
      const projectDir = join(brokenDir, fixture);
      const init = await runCli(['init', '--cwd', projectDir, '--yes'], homeDir);
      expect(init.exitCode, `init on examples/broken/${fixture}`).toBe(0);
      const data = init.envelope.data as { launchers: { name: string }[] };
      const name = data.launchers[0]?.name;
      expect(name, `examples/broken/${fixture} produced a launcher name`).toBeTruthy();

      const uninstall = await runCli(['uninstall', name as string], homeDir);
      expect(uninstall.exitCode, `uninstall on examples/broken/${fixture}`).toBe(0);
    }
  }, 60_000);

  it('a folder with no package.json fails with NO_PACKAGE_JSON (exit 3), not a crash', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'devlaunch-e2e-empty-'));
    try {
      const init = await runCli(['init', '--cwd', emptyDir, '--yes'], homeDir);
      expect(init.exitCode).toBe(3);
      expect(init.envelope.code).toBe('NO_PACKAGE_JSON');
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('status/open/stop/logs/report on an unregistered name all fail with LAUNCHER_NOT_FOUND (exit 3)', async () => {
    for (const command of ['status', 'open', 'stop', 'logs', 'report']) {
      const result = await runCli([command, 'no-such-launcher'], homeDir);
      expect(result.exitCode, command).toBe(3);
      expect(result.envelope.code, command).toBe('LAUNCHER_NOT_FOUND');
    }
  });

  it('doctor runs against the real machine and always returns a well-formed envelope', async () => {
    const result = await runCli(['doctor'], homeDir);
    expect([0, 4]).toContain(result.exitCode);
    expect(Array.isArray((result.envelope.data as { checks: unknown[] }).checks)).toBe(true);
  });
});
