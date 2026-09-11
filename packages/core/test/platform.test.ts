import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DevlaunchError } from '../src/errors/index.js';
import type { CommandResult, CommandRunner } from '../src/platform/index.js';
import {
  createMacosPlatformAdapter,
  createPlatformAdapter,
  createUnsupportedPlatformAdapter,
} from '../src/platform/index.js';

function fakeRunner(handler: (command: string, args: readonly string[]) => CommandResult) {
  const calls: { command: string; args: readonly string[] }[] = [];
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args });
    return handler(command, args);
  };
  return { runner, calls };
}

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'devlaunch-platform-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('createPlatformAdapter', () => {
  it('returns the macos adapter on darwin', () => {
    expect(createPlatformAdapter({ platform: 'darwin' }).platform).toBe('macos');
  });

  it.each(['win32', 'linux', 'aix'] as const)(
    'returns the unsupported adapter on %s',
    (platform) => {
      expect(createPlatformAdapter({ platform }).platform).toBe('unsupported');
    },
  );
});

describe('createUnsupportedPlatformAdapter', () => {
  const adapter = createUnsupportedPlatformAdapter();

  it('throws PLATFORM_UNSUPPORTED from every path method', () => {
    for (const method of [
      'bundleLocation',
      'supportDirectory',
      'logsDirectory',
      'runDirectory',
    ] as const) {
      try {
        adapter[method]();
        expect.unreachable(`${method} should have thrown`);
      } catch (err) {
        expect(err).toBeInstanceOf(DevlaunchError);
        expect((err as DevlaunchError).code).toBe('PLATFORM_UNSUPPORTED');
      }
    }
  });

  it('rejects with PLATFORM_UNSUPPORTED from every async method', async () => {
    await expect(adapter.writeBundle({ bundlePath: '/x', files: [] })).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
    await expect(adapter.registerWithSpotlight('/x')).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
    await expect(adapter.isIndexedBySpotlight('/x')).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
    await expect(
      adapter.showDialog({ title: 't', message: 'm', actions: ['OK'] }),
    ).rejects.toMatchObject({ code: 'PLATFORM_UNSUPPORTED' });
    await expect(adapter.showNotification({ title: 't', body: 'b' })).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
    await expect(adapter.openUrl('http://localhost')).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
    await expect(adapter.revealInFinder('/x')).rejects.toMatchObject({
      code: 'PLATFORM_UNSUPPORTED',
    });
  });
});

describe('createMacosPlatformAdapter — paths', () => {
  const adapter = createMacosPlatformAdapter();

  it('locates bundles under ~/Applications', () => {
    expect(adapter.bundleLocation()).toBe(join(homedir(), 'Applications'));
  });

  it('keeps its own state under ~/Library/Application Support/devlaunch', () => {
    expect(adapter.supportDirectory()).toBe(
      join(homedir(), 'Library', 'Application Support', 'devlaunch'),
    );
    expect(adapter.runDirectory()).toBe(join(adapter.supportDirectory(), 'run'));
  });

  it('logs to ~/Library/Logs/devlaunch', () => {
    expect(adapter.logsDirectory()).toBe(join(homedir(), 'Library', 'Logs', 'devlaunch'));
  });
});

describe('createMacosPlatformAdapter — writeBundle', () => {
  it('writes files, creating nested directories, and chmods executables', async () => {
    const bundlePath = join(tempDir(), 'My App.app');
    const adapter = createMacosPlatformAdapter();

    await adapter.writeBundle({
      bundlePath,
      files: [
        { relativePath: 'Contents/Info.plist', content: '<plist></plist>' },
        {
          relativePath: 'Contents/MacOS/launcher',
          content: '#!/bin/zsh\necho hi\n',
          executable: true,
        },
      ],
    });

    expect(readFileSync(join(bundlePath, 'Contents/Info.plist'), 'utf8')).toBe('<plist></plist>');
    const launcherStat = statSync(join(bundlePath, 'Contents/MacOS/launcher'));
    expect((launcherStat.mode & 0o111) !== 0).toBe(true); // executable bit set
  });
});

describe('createMacosPlatformAdapter — spawned commands', () => {
  it('registerWithSpotlight runs mdimport on the bundle path', async () => {
    const { runner, calls } = fakeRunner(() => ({ stdout: '', stderr: '', exitCode: 0 }));
    await createMacosPlatformAdapter({ runCommand: runner }).registerWithSpotlight('/x/My App.app');
    expect(calls).toEqual([{ command: 'mdimport', args: ['/x/My App.app'] }]);
  });

  it('isIndexedBySpotlight is true only when mdfind lists the exact bundle path', async () => {
    const bundlePath = '/Users/me/Applications/My App.app';
    const { runner } = fakeRunner(() => ({
      stdout: `${bundlePath}\n`,
      stderr: '',
      exitCode: 0,
    }));
    expect(
      await createMacosPlatformAdapter({ runCommand: runner }).isIndexedBySpotlight(bundlePath),
    ).toBe(true);

    const { runner: emptyRunner } = fakeRunner(() => ({ stdout: '', stderr: '', exitCode: 0 }));
    expect(
      await createMacosPlatformAdapter({ runCommand: emptyRunner }).isIndexedBySpotlight(
        bundlePath,
      ),
    ).toBe(false);
  });

  it('showDialog returns the clicked action from osascript output', async () => {
    const { runner, calls } = fakeRunner(() => ({
      stdout: 'button returned:Use Another Port\n',
      stderr: '',
      exitCode: 0,
    }));
    const result = await createMacosPlatformAdapter({ runCommand: runner }).showDialog({
      title: 'Port in use',
      message: 'Port 5173 is already in use.',
      actions: ['Use Another Port', 'Quit Other App', 'Cancel'],
      defaultAction: 'Use Another Port',
    });
    expect(result).toEqual({ outcome: 'action', action: 'Use Another Port' });
    expect(calls[0]?.command).toBe('osascript');
    const script = calls[0]?.args[1] as string;
    expect(script).toContain('"Port in use"');
    expect(script).toContain('"Use Another Port"');
    expect(script).toContain('default button "Use Another Port"');
  });

  it('showDialog reports "cancelled" when osascript exits non-zero', async () => {
    const { runner } = fakeRunner(() => ({ stdout: '', stderr: 'User canceled.', exitCode: 1 }));
    const result = await createMacosPlatformAdapter({ runCommand: runner }).showDialog({
      title: 't',
      message: 'm',
      actions: ['OK'],
    });
    expect(result).toEqual({ outcome: 'cancelled' });
  });

  it('escapes quotes in dialog text so the AppleScript stays valid', async () => {
    const { runner, calls } = fakeRunner(() => ({
      stdout: 'button returned:OK\n',
      stderr: '',
      exitCode: 0,
    }));
    await createMacosPlatformAdapter({ runCommand: runner }).showDialog({
      title: 't',
      message: 'Say "hello" to your app',
      actions: ['OK'],
    });
    const script = calls[0]?.args[1] as string;
    expect(script).toContain('Say \\"hello\\" to your app');
  });

  it('showNotification runs osascript with title and body', async () => {
    const { runner, calls } = fakeRunner(() => ({ stdout: '', stderr: '', exitCode: 0 }));
    await createMacosPlatformAdapter({ runCommand: runner }).showNotification({
      title: 'devlaunch',
      body: 'Ready at http://localhost:5173',
    });
    expect(calls[0]?.command).toBe('osascript');
    expect(calls[0]?.args[1]).toContain('display notification');
    expect(calls[0]?.args[1]).toContain('Ready at http://localhost:5173');
  });

  it('openUrl runs `open <url>`', async () => {
    const { runner, calls } = fakeRunner(() => ({ stdout: '', stderr: '', exitCode: 0 }));
    await createMacosPlatformAdapter({ runCommand: runner }).openUrl('http://localhost:5173');
    expect(calls).toEqual([{ command: 'open', args: ['http://localhost:5173'] }]);
  });

  it('revealInFinder runs `open -R <path>`', async () => {
    const { runner, calls } = fakeRunner(() => ({ stdout: '', stderr: '', exitCode: 0 }));
    await createMacosPlatformAdapter({ runCommand: runner }).revealInFinder('/x/log.log');
    expect(calls).toEqual([{ command: 'open', args: ['-R', '/x/log.log'] }]);
  });
});
