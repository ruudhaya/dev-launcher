import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LauncherEnvInputs, LauncherMode } from '@devlaunch/core';
import {
  generateLauncherEnv,
  readRegistry,
  upsertRegistryEntry,
  writeRegistry,
} from '@devlaunch/core';
import type { TestAdapterHandle } from './test-adapter.js';

export interface RegisterLauncherOptions {
  readonly name: string;
  readonly projectDir: string;
  readonly slug?: string;
  readonly command?: string;
  readonly port?: number;
  readonly mode?: LauncherMode;
  readonly openPath?: string;
  /** If set, writes a pid file — pass process.pid to simulate "running", or an unlikely pid for "stopped". */
  readonly pid?: number;
  /** If set, writes a log file with these lines. */
  readonly logLines?: readonly string[];
  /** If false, skips writing the bundle directory itself — simulates a registry entry for a deleted .app. */
  readonly writeBundleDir?: boolean;
}

export interface RegisteredLauncher {
  readonly bundlePath: string;
  readonly slug: string;
}

/**
 * Writes everything a real `devlaunch init` would have produced, as far as
 * the CLI commands under test read it: the registry entry, the bundle's
 * launcher.env, and optionally a pid/log file — without generating a whole
 * real .app (no Info.plist/launcher script/icon needed for these tests).
 */
export async function registerLauncher(
  handle: TestAdapterHandle,
  options: RegisterLauncherOptions,
): Promise<RegisteredLauncher> {
  const slug = options.slug ?? options.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const bundlePath = join(handle.adapter.bundleLocation(), `${options.name}.app`);

  const envInputs: LauncherEnvInputs = {
    projectDir: options.projectDir,
    name: options.name,
    slug,
    command: options.command ?? 'npm run dev',
    port: options.port,
    mode: options.mode ?? 'terminal',
    openPath: options.openPath ?? '/',
    browser: undefined,
    readyTimeoutSeconds: 90,
    packageManager: 'npm',
    nodeVersion: undefined,
    devlaunchVersion: '0.0.0',
  };

  if (options.writeBundleDir !== false) {
    const resourcesDir = join(bundlePath, 'Contents/Resources');
    await mkdir(resourcesDir, { recursive: true });
    await writeFile(join(resourcesDir, 'launcher.env'), generateLauncherEnv(envInputs), 'utf8');
  }

  const registry = await readRegistry(handle.adapter);
  const updated = upsertRegistryEntry(registry, options.name, {
    projectDir: options.projectDir,
    bundlePath,
    devlaunchVersion: '0.0.0',
  });
  await writeRegistry(handle.adapter, updated);

  if (options.pid !== undefined) {
    await mkdir(handle.adapter.runDirectory(), { recursive: true });
    await writeFile(
      join(handle.adapter.runDirectory(), `${slug}.pid`),
      String(options.pid),
      'utf8',
    );
  }

  if (options.logLines !== undefined) {
    await mkdir(handle.adapter.logsDirectory(), { recursive: true });
    await writeFile(
      join(handle.adapter.logsDirectory(), `${slug}.log`),
      `${options.logLines.join('\n')}\n`,
      'utf8',
    );
  }

  return { bundlePath, slug };
}
