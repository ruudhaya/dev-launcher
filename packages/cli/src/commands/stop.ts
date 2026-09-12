import { rm } from 'node:fs/promises';
import type { ParsedArgs } from '../argv.js';
import { flagBoolean } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { okEnvelope } from '../envelope.js';
import { EXIT_CODES } from '../exit-codes.js';
import type { LauncherLookup } from '../launcher-lookup.js';
import { findLauncher, launcherRuntimeInfo, listLaunchers } from '../launcher-lookup.js';
import { launcherNotFoundResult } from '../not-found.js';
import { killTree } from '../process-utils.js';

export async function runStop(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const all = flagBoolean(args.flags, 'all');
  const name = args.positionals[0];

  let targets: readonly LauncherLookup[];
  if (all) {
    targets = await listLaunchers(ctx.adapter);
  } else {
    const lookup = await findLauncher(ctx.adapter, name, ctx.cwd);
    if (!lookup) {
      return launcherNotFoundResult(name, ctx.cwd);
    }
    targets = [lookup];
  }

  const stopped: string[] = [];

  for (const lookup of targets) {
    let info: ReturnType<typeof launcherRuntimeInfo>;
    try {
      info = launcherRuntimeInfo(ctx.adapter, lookup);
    } catch {
      continue; // launcher.env unreadable — nothing to stop
    }
    if (!info.running || info.pid === undefined) {
      continue;
    }
    if (!ctx.dryRun) {
      killTree(info.pid);
      await rm(info.pidFile, { force: true });
    }
    stopped.push(lookup.name);
  }

  const verb = ctx.dryRun ? 'Would stop' : 'Stopped';
  const message =
    stopped.length === 0
      ? all
        ? 'Nothing is running.'
        : `"${targets[0]?.name}" is already stopped.`
      : `${verb} ${stopped.join(', ')}.`;

  return {
    envelope: okEnvelope(message, { stopped }),
    exitCode: EXIT_CODES.OK,
    plainLines: [message],
  };
}
