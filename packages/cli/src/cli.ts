import { CORE_VERSION } from '@devlaunch/core';
import type { ParsedArgs } from './argv.js';
import { flagBoolean, parseArgs } from './argv.js';
import type { CommandResult } from './command-result.js';
import { runDoctor } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { runList } from './commands/list.js';
import { runLogs } from './commands/logs.js';
import { runOpen } from './commands/open.js';
import { runReport } from './commands/report.js';
import { runStatus } from './commands/status.js';
import { runStop } from './commands/stop.js';
import { runUninstall } from './commands/uninstall.js';
import type { CliContext } from './context.js';
import { buildContext } from './context.js';
import { envelopeFromError, errEnvelope } from './envelope.js';
import { EXIT_CODES, exitCodeForError } from './exit-codes.js';

const USAGE = `devlaunch — turn a local dev server into a macOS app you launch from Spotlight

Usage:
  devlaunch <command> [options]

Commands:
  init [--name <name>] [--mode terminal|headless]   Detect this project and generate a launcher app
  open [name]                                       Open a launcher, like double-clicking it
  status [name]                                     Is it running, and on what port?
  list                                               Show every launcher devlaunch has generated
  stop [name | --all]                               Stop a running launcher
  logs [name] [--tail N]                            Print a launcher's log (redacted, default --tail 80)
  report [name] [--clipboard]                       Build a diagnostic report (redacted)
  doctor                                             Check macOS/Node/Spotlight/config/ports for problems
  uninstall [name | --all]                          Remove a generated launcher — the undo for init

Options:
  -h, --help       Show this help
  -v, --version    Show version
  --cwd <dir>      Run as if started in this directory (init, doctor)
  -y, --yes        Never prompt; use documented defaults
  --dry-run        Show what would change without changing anything (init, stop, uninstall)
  --json           Machine-readable output — one JSON object per line, see docs/agent-contract.md
  --all            Apply to every launcher (stop, uninstall)

Examples:
  devlaunch init
  devlaunch init --cwd ./apps/web --name web --yes
  devlaunch init --dry-run --json
  devlaunch list
  devlaunch status my-app
  devlaunch stop --all
  devlaunch logs my-app --tail 200
  devlaunch report my-app --clipboard
  devlaunch doctor --json
  devlaunch uninstall my-app

Every command works the same piped or run by an agent: --json output, stable
exit codes, and no prompts with --yes or a non-interactive terminal. Never
phones home. See docs/agent-contract.md for the full contract.`;

function printResult(ctx: CliContext, result: CommandResult): void {
  if (ctx.json) {
    process.stdout.write(`${JSON.stringify(result.envelope)}\n`);
    return;
  }

  if (result.envelope.ok) {
    const lines = result.plainLines ?? [result.envelope.message];
    process.stdout.write(`${lines.join('\n')}\n`);
    return;
  }

  const lines = result.plainLines ?? [
    result.envelope.message,
    ...(result.envelope.hint ? [result.envelope.hint] : []),
  ];
  process.stderr.write(`${lines.join('\n')}\n`);
}

async function dispatch(
  command: string,
  ctx: CliContext,
  args: ParsedArgs,
): Promise<CommandResult> {
  switch (command) {
    case 'init':
      return runInit(ctx, args);
    case 'open':
      return runOpen(ctx, args);
    case 'status':
      return runStatus(ctx, args);
    case 'list':
      return runList(ctx);
    case 'stop':
      return runStop(ctx, args);
    case 'logs':
      return runLogs(ctx, args);
    case 'report':
      return runReport(ctx, args);
    case 'doctor':
      return runDoctor(ctx);
    case 'uninstall':
      return runUninstall(ctx, args);
    default:
      return {
        envelope: errEnvelope(
          'USAGE',
          `Unknown command "${command}".`,
          'Run `devlaunch --help` to see every command.',
        ),
        exitCode: EXIT_CODES.USAGE,
        plainLines: [`devlaunch: unknown command "${command}"`, '', USAGE],
      };
  }
}

/**
 * Parse argv and dispatch. Returns the process exit code. All output happens
 * here (cli owns I/O); nothing below this calls process.exit directly — see
 * index.ts, which sets process.exitCode from this instead.
 */
export async function run(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const [command] = args.positionals;

  // --version (checked first: with no command, "devlaunch --version" would
  // otherwise fall into the "no command" help case below).
  if (command === 'version' || flagBoolean(args.flags, 'version')) {
    process.stdout.write(`${CORE_VERSION}\n`);
    return EXIT_CODES.OK;
  }

  if (command === undefined || command === 'help' || flagBoolean(args.flags, 'help')) {
    process.stdout.write(`${USAGE}\n`);
    return EXIT_CODES.OK;
  }

  if (process.platform !== 'darwin') {
    // Non-macOS must exit cleanly with a friendly message, never crash or
    // pretend to succeed — see the "no postinstall hooks" principle in CLAUDE.md.
    process.stdout.write(
      'devlaunch generates macOS apps and only runs on macOS.\n' +
        `Detected platform: ${process.platform}. Nothing was changed.\n`,
    );
    return EXIT_CODES.OK;
  }

  const ctx = buildContext(args);
  const commandArgs: ParsedArgs = { positionals: args.positionals.slice(1), flags: args.flags };

  let result: CommandResult;
  try {
    result = await dispatch(command, ctx, commandArgs);
  } catch (error) {
    result = { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
  }

  printResult(ctx, result);
  return result.exitCode;
}
