/**
 * devlaunch CLI entry point.
 *
 * This is the ONLY layer allowed to do I/O: read argv, write stdout/stderr, set
 * exit codes, and (later) present native macOS dialogs. It stays a thin shell
 * over `run()` so the logic is testable without a real process.
 */
import { run } from './cli.js';

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    // Last-resort guard. Product code should surface failures as typed results,
    // never as uncaught throws — see the error-handling principle in CLAUDE.md.
    process.stderr.write(`devlaunch: unexpected error\n${String(err)}\n`);
    process.exitCode = 1;
  });
