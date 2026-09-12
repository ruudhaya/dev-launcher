import { readFileSync } from 'node:fs';
import { redactText } from '@devlaunch/core';
import type { ParsedArgs } from '../argv.js';
import { flagString } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { errEnvelope, okEnvelope } from '../envelope.js';
import { EXIT_CODES } from '../exit-codes.js';
import { findLauncher, launcherRuntimeInfo } from '../launcher-lookup.js';
import { launcherNotFoundResult } from '../not-found.js';
import { collectProjectSecretValues } from '../project-secrets.js';

const DEFAULT_TAIL = 80;

function readLogLines(logFile: string): string[] {
  let raw: string;
  try {
    raw = readFileSync(logFile, 'utf8');
  } catch {
    return [];
  }
  const lines = raw.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop(); // trailing newline produces a phantom empty last line
  }
  return lines;
}

export async function runLogs(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const name = args.positionals[0];
  const tailFlag = flagString(args.flags, 'tail');
  let tail = DEFAULT_TAIL;
  if (tailFlag !== undefined) {
    const parsed = Number.parseInt(tailFlag, 10);
    if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== tailFlag) {
      return {
        envelope: errEnvelope('CONFIG_INVALID', '--tail must be a non-negative integer.'),
        exitCode: EXIT_CODES.USAGE,
      };
    }
    tail = parsed;
  }

  const lookup = await findLauncher(ctx.adapter, name, ctx.cwd);
  if (!lookup) {
    return launcherNotFoundResult(name, ctx.cwd);
  }

  const info = launcherRuntimeInfo(ctx.adapter, lookup);
  const secretValues = collectProjectSecretValues(lookup.entry.projectDir);
  // slice(-0) is slice(0) (the whole array) since -0 === 0, so 0 needs its own case.
  const tailed = tail === 0 ? [] : readLogLines(info.logFile).slice(-tail);
  const lines = tailed.map((line) => redactText(line, secretValues));

  const message =
    lines.length === 0
      ? `No logs yet for "${lookup.name}".`
      : `Last ${lines.length} line${lines.length === 1 ? '' : 's'} of "${lookup.name}".`;

  return {
    envelope: okEnvelope(message, { name: lookup.name, lines }),
    exitCode: EXIT_CODES.OK,
    plainLines: lines.length === 0 ? [message] : lines,
  };
}
