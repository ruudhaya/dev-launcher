import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { okEnvelope } from '../envelope.js';
import { EXIT_CODES } from '../exit-codes.js';
import { launcherRuntimeInfo, listLaunchers } from '../launcher-lookup.js';

export async function runList(ctx: CliContext): Promise<CommandResult> {
  const lookups = await listLaunchers(ctx.adapter);

  const launchers = lookups.map((lookup) => {
    let running = false;
    try {
      running = launcherRuntimeInfo(ctx.adapter, lookup).running;
    } catch {
      // Bundle's launcher.env is unreadable (e.g. the .app was deleted by
      // hand) — report it as not running rather than failing the whole list.
      running = false;
    }
    return { name: lookup.name, projectDir: lookup.entry.projectDir, running };
  });

  const message =
    launchers.length === 0
      ? 'No launchers yet. Run `devlaunch init` in a project to create one.'
      : `${launchers.length} launcher${launchers.length === 1 ? '' : 's'}.`;

  const plainLines =
    launchers.length === 0
      ? [message]
      : [
          message,
          ...launchers.map((l) => `  ${l.running ? '●' : '○'} ${l.name} — ${l.projectDir}`),
        ];

  return { envelope: okEnvelope(message, { launchers }), exitCode: EXIT_CODES.OK, plainLines };
}
