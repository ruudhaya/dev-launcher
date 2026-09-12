import type { ParsedArgs } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { okEnvelope } from '../envelope.js';
import { EXIT_CODES } from '../exit-codes.js';
import { findLauncher } from '../launcher-lookup.js';
import { launcherNotFoundResult } from '../not-found.js';

export async function runOpen(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const name = args.positionals[0];
  const lookup = await findLauncher(ctx.adapter, name, ctx.cwd);
  if (!lookup) {
    return launcherNotFoundResult(name, ctx.cwd);
  }

  await ctx.adapter.openUrl(lookup.entry.bundlePath);

  const message = `Opening "${lookup.name}"…`;
  return {
    envelope: okEnvelope(message, { name: lookup.name }),
    exitCode: EXIT_CODES.OK,
    plainLines: [message],
  };
}
