import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { DevlaunchError } from '../errors/index.js';
import { ICONSET_ENTRIES } from '../icon/iconset.js';
import type { CommandRunner } from './command-runner.js';
import { createSystemCommandRunner } from './command-runner.js';
import type {
  DialogOptions,
  DialogResult,
  NotificationOptions,
  PlatformAdapter,
  WriteBundleOptions,
} from './types.js';

/** Escape a string for safe embedding inside a double-quoted AppleScript string literal. */
function osascriptQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export interface MacosPlatformAdapterOptions {
  /** Defaults to a real command runner; tests inject a fake one. */
  readonly runCommand?: CommandRunner;
}

export function createMacosPlatformAdapter(
  options: MacosPlatformAdapterOptions = {},
): PlatformAdapter {
  const runCommand = options.runCommand ?? createSystemCommandRunner();

  const bundleLocation = () => join(homedir(), 'Applications');
  const supportDirectory = () => join(homedir(), 'Library', 'Application Support', 'devlaunch');
  const logsDirectory = () => join(homedir(), 'Library', 'Logs', 'devlaunch');
  const runDirectory = () => join(supportDirectory(), 'run');

  return {
    platform: 'macos',
    bundleLocation,
    supportDirectory,
    logsDirectory,
    runDirectory,

    async writeBundle({ bundlePath, files }: WriteBundleOptions): Promise<void> {
      for (const file of files) {
        const fullPath = join(bundlePath, file.relativePath);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, file.content);
        if (file.executable) {
          await chmod(fullPath, 0o755);
        }
      }
    },

    async readTextFile(path: string): Promise<string | undefined> {
      try {
        return await readFile(path, 'utf8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return undefined;
        }
        throw error;
      }
    },

    async writeTextFile(path: string, content: string): Promise<void> {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, 'utf8');
    },

    async convertPngToIcns(pngPath: string): Promise<Uint8Array> {
      const workDir = await mkdtemp(join(tmpdir(), 'devlaunch-icon-'));
      const iconsetDir = join(workDir, 'icon.iconset');
      const icnsPath = join(workDir, 'icon.icns');
      try {
        await mkdir(iconsetDir, { recursive: true });

        for (const { fileName, pixels } of ICONSET_ENTRIES) {
          const result = await runCommand('sips', [
            '-z',
            String(pixels),
            String(pixels),
            pngPath,
            '--out',
            join(iconsetDir, fileName),
          ]);
          if (result.exitCode !== 0) {
            throw new DevlaunchError(
              'DEVLAUNCH_BUG',
              `sips failed converting "${pngPath}" to ${fileName}: ${result.stderr.trim()}`,
            );
          }
        }

        const iconutilResult = await runCommand('iconutil', [
          '-c',
          'icns',
          iconsetDir,
          '-o',
          icnsPath,
        ]);
        if (iconutilResult.exitCode !== 0) {
          throw new DevlaunchError(
            'DEVLAUNCH_BUG',
            `iconutil failed converting "${pngPath}": ${iconutilResult.stderr.trim()}`,
          );
        }

        return new Uint8Array(await readFile(icnsPath));
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },

    async registerWithSpotlight(bundlePath: string): Promise<void> {
      await runCommand('mdimport', [bundlePath]);
    },

    async isIndexedBySpotlight(bundlePath: string): Promise<boolean> {
      const { stdout } = await runCommand('mdfind', [
        '-onlyin',
        dirname(bundlePath),
        `kMDItemFSName == '${basename(bundlePath)}'`,
      ]);
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .includes(bundlePath);
    },

    async showDialog(dialogOptions: DialogOptions): Promise<DialogResult> {
      const buttons = dialogOptions.actions.map(osascriptQuote).join(', ');
      const defaultButtonClause = dialogOptions.defaultAction
        ? ` default button ${osascriptQuote(dialogOptions.defaultAction)}`
        : '';
      const script =
        `display dialog ${osascriptQuote(dialogOptions.message)} ` +
        `with title ${osascriptQuote(dialogOptions.title)} ` +
        `buttons {${buttons}}${defaultButtonClause}`;

      const result = await runCommand('osascript', ['-e', script]);
      if (result.exitCode !== 0) {
        // Non-zero here means the user dismissed the dialog (Escape / red close
        // button), which osascript reports as a failure — not a devlaunch error.
        return { outcome: 'cancelled' };
      }

      const match = result.stdout.match(/button returned:([^,\n]+)/);
      const action = match?.[1]?.trim();
      return action ? { outcome: 'action', action } : { outcome: 'cancelled' };
    },

    async showNotification({ title, body }: NotificationOptions): Promise<void> {
      const script = `display notification ${osascriptQuote(body)} with title ${osascriptQuote(title)}`;
      await runCommand('osascript', ['-e', script]);
    },

    async openUrl(url: string): Promise<void> {
      await runCommand('open', [url]);
    },

    async revealInFinder(path: string): Promise<void> {
      await runCommand('open', ['-R', path]);
    },
  };
}
