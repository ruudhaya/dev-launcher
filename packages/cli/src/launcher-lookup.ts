import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BundleRegistryEntry, PlatformAdapter } from '@devlaunch/core';
import { parseEnvFile, readRegistry } from '@devlaunch/core';
import { isProcessAlive } from './process-utils.js';

export interface LauncherLookup {
  readonly name: string;
  readonly entry: BundleRegistryEntry;
}

/**
 * Finds a launcher by name, or — if no name is given — the one whose
 * projectDir matches cwd (so `devlaunch status` run from inside a project
 * finds its own launcher without needing --name).
 */
export async function findLauncher(
  adapter: PlatformAdapter,
  name: string | undefined,
  cwd: string,
): Promise<LauncherLookup | undefined> {
  const registry = await readRegistry(adapter);
  if (name) {
    const entry = registry[name];
    return entry ? { name, entry } : undefined;
  }
  const match = Object.entries(registry).find(([, entry]) => entry.projectDir === cwd);
  return match ? { name: match[0], entry: match[1] } : undefined;
}

export async function listLaunchers(adapter: PlatformAdapter): Promise<readonly LauncherLookup[]> {
  const registry = await readRegistry(adapter);
  return Object.entries(registry).map(([name, entry]) => ({ name, entry }));
}

/** Reads Resources/launcher.env out of a bundle — same format as a .env file. */
export function readLauncherEnv(bundlePath: string): Record<string, string> {
  const path = join(bundlePath, 'Contents/Resources/launcher.env');
  return parseEnvFile(readFileSync(path, 'utf8'));
}

export interface LauncherRuntimeInfo {
  readonly slug: string;
  readonly pidFile: string;
  readonly logFile: string;
  readonly pid: number | undefined;
  readonly running: boolean;
  readonly port: number | undefined;
  /** Defaults to "/" — see DEFAULT_OPEN_PATH in @devlaunch/core. */
  readonly openPath: string;
}

/** Everything status/stop/logs need about a launcher's current runtime state. */
export function launcherRuntimeInfo(
  adapter: PlatformAdapter,
  lookup: LauncherLookup,
): LauncherRuntimeInfo {
  const env = readLauncherEnv(lookup.entry.bundlePath);
  const slug = env.DEVLAUNCH_SLUG ?? lookup.name;
  const pidFile = join(adapter.runDirectory(), `${slug}.pid`);
  const logFile = join(adapter.logsDirectory(), `${slug}.log`);

  let pid: number | undefined;
  try {
    const raw = readFileSync(pidFile, 'utf8').trim();
    const parsed = Number.parseInt(raw, 10);
    if (Number.isInteger(parsed)) pid = parsed;
  } catch {
    pid = undefined;
  }

  const running = pid !== undefined && isProcessAlive(pid);
  const port = env.DEVLAUNCH_PORT ? Number.parseInt(env.DEVLAUNCH_PORT, 10) : undefined;

  return { slug, pidFile, logFile, pid, running, port, openPath: env.DEVLAUNCH_OPEN_PATH ?? '/' };
}
