import type { CommandRunner } from './command-runner.js';
import { createMacosPlatformAdapter } from './macos.js';
import type { PlatformAdapter } from './types.js';
import { createUnsupportedPlatformAdapter } from './unsupported.js';

export interface CreatePlatformAdapterOptions {
  /** Defaults to process.platform; tests pass 'darwin' or anything else. */
  readonly platform?: NodeJS.Platform;
  /** Only used when platform is 'darwin'; defaults to a real command runner. */
  readonly runCommand?: CommandRunner;
}

/** Picks the right adapter for the current (or given) platform. */
export function createPlatformAdapter(options: CreatePlatformAdapterOptions = {}): PlatformAdapter {
  const platform = options.platform ?? process.platform;
  if (platform === 'darwin') {
    return createMacosPlatformAdapter({ runCommand: options.runCommand });
  }
  return createUnsupportedPlatformAdapter();
}
