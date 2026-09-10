import { CORE_VERSION } from '@devlaunch/core';

const USAGE = `devlaunch — turn a local dev server into a macOS app you launch from Spotlight

Usage:
  devlaunch <command> [options]

Commands:
  init        Detect this project and generate a launcher app   (not implemented yet)
  list        Show launchers devlaunch has generated            (not implemented yet)
  remove      Remove a generated launcher and undo its changes  (not implemented yet)

Options:
  -h, --help       Show this help
  -v, --version    Show version

This is a scaffold build. No commands do real work yet.`;

/**
 * Parse argv and dispatch. Returns the process exit code. All output happens
 * here (cli owns I/O); nothing below this calls process.exit directly.
 */
export async function run(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (command === undefined || command === '-h' || command === '--help' || command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  if (command === '-v' || command === '--version' || command === 'version') {
    process.stdout.write(`${CORE_VERSION}\n`);
    return 0;
  }

  if (process.platform !== 'darwin') {
    // Non-macOS must exit cleanly with a friendly message, never crash.
    process.stdout.write(
      'devlaunch generates macOS apps and only runs on macOS.\n' +
        `Detected platform: ${process.platform}. Nothing was changed.\n`,
    );
    return 0;
  }

  switch (command) {
    case 'init':
    case 'list':
    case 'remove': {
      void rest;
      process.stderr.write(
        `devlaunch ${command}: not implemented yet.\n` +
          'This build only sets up the repo structure; product logic lands in a later change.\n',
      );
      return 1;
    }
    default: {
      process.stderr.write(`devlaunch: unknown command "${command}"\n\n${USAGE}\n`);
      return 1;
    }
  }
}
