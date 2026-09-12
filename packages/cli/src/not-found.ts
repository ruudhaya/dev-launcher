import { getErrorEntry } from '@devlaunch/core';
import type { CommandResult } from './command-result.js';
import { errEnvelope } from './envelope.js';
import { exitCodeForErrorCode } from './exit-codes.js';

/**
 * The shared "no such launcher" result for open/status/stop/logs/report/
 * uninstall, all of which look a launcher up by name or by cwd the same way
 * (see findLauncher in launcher-lookup.ts).
 */
export function launcherNotFoundResult(name: string | undefined, cwd: string): CommandResult {
  const entry = getErrorEntry('LAUNCHER_NOT_FOUND');
  const message = name
    ? `No launcher named "${name}".`
    : `No launcher registered for "${cwd}". Run \`devlaunch init\` here, or pass a name.`;
  return {
    envelope: errEnvelope('LAUNCHER_NOT_FOUND', message, entry.agentHint),
    exitCode: exitCodeForErrorCode('LAUNCHER_NOT_FOUND'),
  };
}
