import { rm } from 'node:fs/promises';
import { readRegistry, removeRegistryEntry, writeRegistry } from '@devlaunch/core';
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

/** The undo for `init`: stops it if running, deletes the .app bundle and any pid/log files, and forgets it. */
export async function runUninstall(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
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

  if (targets.length === 0) {
    const message = 'Nothing to uninstall.';
    return {
      envelope: okEnvelope(message, { removed: [] }),
      exitCode: EXIT_CODES.OK,
      plainLines: [message],
    };
  }

  const removed: string[] = [];
  let registry = await readRegistry(ctx.adapter);

  for (const lookup of targets) {
    if (!ctx.dryRun) {
      let info: ReturnType<typeof launcherRuntimeInfo> | undefined;
      try {
        info = launcherRuntimeInfo(ctx.adapter, lookup);
      } catch {
        info = undefined;
      }
      if (info?.running && info.pid !== undefined) {
        killTree(info.pid);
      }

      await rm(lookup.entry.bundlePath, { recursive: true, force: true });
      if (info) {
        await rm(info.pidFile, { force: true });
        await rm(info.logFile, { force: true });
      }
      registry = removeRegistryEntry(registry, lookup.name);
    }
    removed.push(lookup.name);
  }

  if (!ctx.dryRun) {
    await writeRegistry(ctx.adapter, registry);
  }

  const verb = ctx.dryRun ? 'Would remove' : 'Removed';
  const message = `${verb} ${removed.join(', ')}.`;
  return {
    envelope: okEnvelope(message, { removed }),
    exitCode: EXIT_CODES.OK,
    plainLines: [message],
  };
}
