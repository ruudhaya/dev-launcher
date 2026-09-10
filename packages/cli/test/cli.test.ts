import { afterEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('devlaunch cli scaffold', () => {
  it('prints usage and exits 0 with --help', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run(['--help']);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  it('prints a version and exits 0 with --version', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    const code = await run(['--version']);
    expect(code).toBe(0);
    expect(out).toHaveBeenCalled();
  });

  it('exits 1 on an unknown command', async () => {
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const code = await run(['frobnicate']);
    expect(code).toBe(1);
  });
});
