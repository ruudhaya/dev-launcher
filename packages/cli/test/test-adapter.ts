import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  DialogOptions,
  NotificationOptions,
  PlatformAdapter,
  WriteBundleOptions,
} from '@devlaunch/core';

/**
 * A PlatformAdapter for CLI command tests: real filesystem I/O (so raw
 * node:fs reads elsewhere in the CLI — logs, uninstall's bundle removal —
 * see the same files this adapter writes) rooted under a temp directory
 * instead of the real home directory, with every macOS-shell-out method
 * (Spotlight, dialogs, notifications, open, icon conversion) faked and
 * recorded instead of actually touching the machine.
 */
export interface TestAdapterHandle {
  readonly adapter: PlatformAdapter;
  readonly root: string;
  readonly calls: {
    readonly spotlight: string[];
    readonly dialogs: DialogOptions[];
    readonly notifications: NotificationOptions[];
    readonly opened: string[];
    readonly revealed: string[];
  };
}

export function createTestAdapter(root: string): TestAdapterHandle {
  const bundleLocation = join(root, 'Applications');
  const supportDirectory = join(root, 'Support');
  const logsDirectory = join(root, 'Logs');
  const runDirectory = join(supportDirectory, 'run');

  const calls: TestAdapterHandle['calls'] = {
    spotlight: [],
    dialogs: [],
    notifications: [],
    opened: [],
    revealed: [],
  };

  const adapter: PlatformAdapter = {
    platform: 'macos',
    bundleLocation: () => bundleLocation,
    supportDirectory: () => supportDirectory,
    logsDirectory: () => logsDirectory,
    runDirectory: () => runDirectory,

    async writeBundle({ bundlePath, files }: WriteBundleOptions): Promise<void> {
      for (const file of files) {
        const fullPath = join(bundlePath, file.relativePath);
        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, file.content);
      }
    },

    async registerWithSpotlight(bundlePath: string): Promise<void> {
      calls.spotlight.push(bundlePath);
    },

    async isIndexedBySpotlight(): Promise<boolean> {
      return true;
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

    async convertPngToIcns(): Promise<Uint8Array> {
      return new Uint8Array();
    },

    async showDialog(options: DialogOptions) {
      calls.dialogs.push(options);
      return { outcome: 'cancelled' } as const;
    },

    async showNotification(options: NotificationOptions): Promise<void> {
      calls.notifications.push(options);
    },

    async openUrl(url: string): Promise<void> {
      calls.opened.push(url);
    },

    async revealInFinder(path: string): Promise<void> {
      calls.revealed.push(path);
    },
  };

  return { adapter, root, calls };
}

export async function cleanupTestAdapter(handle: TestAdapterHandle): Promise<void> {
  await rm(handle.root, { recursive: true, force: true });
}
