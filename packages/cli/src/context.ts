import { resolve } from 'node:path';
import type { PlatformAdapter } from '@devlaunch/core';
import { CORE_VERSION, createPlatformAdapter } from '@devlaunch/core';
import type { ParsedArgs } from './argv.js';
import { flagBoolean, flagString } from './argv.js';
import { copyToClipboard } from './clipboard.js';

export interface CliContext {
  readonly cwd: string;
  readonly json: boolean;
  readonly yes: boolean;
  readonly dryRun: boolean;
  readonly noColor: boolean;
  /** True only when it's safe to prompt: a real TTY, not --json, not --yes. */
  readonly interactive: boolean;
  readonly adapter: PlatformAdapter;
  readonly devlaunchVersion: string;
  /** Injectable so tests don't need a real pbcopy — see clipboard.ts. */
  readonly copyToClipboard: (text: string) => Promise<void>;
}

export function buildContext(args: ParsedArgs): CliContext {
  const json = flagBoolean(args.flags, 'json');
  const yes = flagBoolean(args.flags, 'yes');
  const dryRun = flagBoolean(args.flags, 'dry-run');
  const cwdFlag = flagString(args.flags, 'cwd');

  return {
    cwd: cwdFlag ? resolve(cwdFlag) : process.cwd(),
    json,
    yes,
    dryRun,
    noColor: json || process.env.NO_COLOR !== undefined,
    interactive: process.stdin.isTTY === true && process.stdout.isTTY === true && !yes && !json,
    adapter: createPlatformAdapter(),
    devlaunchVersion: CORE_VERSION,
    copyToClipboard,
  };
}
