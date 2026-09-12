import type { ParsedArgs } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { okEnvelope } from '../envelope.js';
import { EXIT_CODES } from '../exit-codes.js';
import { findLauncher, launcherRuntimeInfo } from '../launcher-lookup.js';
import { launcherNotFoundResult } from '../not-found.js';

export async function runStatus(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const name = args.positionals[0];
  const lookup = await findLauncher(ctx.adapter, name, ctx.cwd);
  if (!lookup) {
    return launcherNotFoundResult(name, ctx.cwd);
  }

  const info = launcherRuntimeInfo(ctx.adapter, lookup);
  const url =
    info.running && info.port !== undefined
      ? `http://localhost:${info.port}${info.openPath}`
      : null;

  const data = {
    name: lookup.name,
    running: info.running,
    pid: info.running ? (info.pid ?? null) : null,
    port: info.port ?? null,
    url,
  };

  const message = info.running
    ? `"${lookup.name}" is running (pid ${info.pid}, port ${info.port ?? 'unknown'}).`
    : `"${lookup.name}" is not running.`;

  const plainLines = url ? [message, `  ${url}`] : [message];

  return { envelope: okEnvelope(message, data), exitCode: EXIT_CODES.OK, plainLines };
}
