import { CORE_VERSION } from '@devlaunch/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('devlaunch cli', () => {
  it('prints usage and exits 0 with --help', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run(['--help']);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('prints usage and exits 0 with no command at all', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run([]);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  // Regression: --version with no command was swallowed by the "no command"
  // help branch (that branch matched on command === undefined first) —
  // exit code and "called" were both green, so a looser assertion here
  // would have missed it; this pins the actual printed content.
  it('prints exactly the version and exits 0 with --version, not the help text', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run(['--version']);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalledWith(`${CORE_VERSION}\n`);
    expect(out).not.toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('also accepts "devlaunch version" as a command', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run(['version']);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalledWith(`${CORE_VERSION}\n`);
  });

  it('exits 2 (usage error) on an unknown command', async () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const code = await run(['frobnicate']);
    expect(code).toBe(2);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('unknown command "frobnicate"'));
  });
});
