/**
 * A tiny, dependency-free argv parser — the CLI ships as a single file with
 * no runtime dependencies, so no yargs/commander. Handles what devlaunch's
 * commands actually need: positionals, `--flag value`, `--flag=value`, and
 * bare boolean flags, plus a couple of short aliases.
 */
export interface ParsedArgs {
  readonly positionals: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const SHORT_FLAG_ALIASES: Readonly<Record<string, string>> = {
  h: 'help',
  v: 'version',
  y: 'yes',
};

/** Flags that never take a value — a following bare word is a positional, not their value. */
const BOOLEAN_FLAGS = new Set(['help', 'version', 'yes', 'dry-run', 'json', 'all', 'clipboard']);

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
        continue;
      }
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!BOOLEAN_FLAGS.has(key) && next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (arg.startsWith('-') && arg.length === 2) {
      const key = SHORT_FLAG_ALIASES[arg.slice(1)];
      if (key) {
        flags[key] = true;
        continue;
      }
    }

    positionals.push(arg);
  }

  return { positionals, flags };
}

export function flagString(flags: ParsedArgs['flags'], key: string): string | undefined {
  const value = flags[key];
  return typeof value === 'string' ? value : undefined;
}

export function flagBoolean(flags: ParsedArgs['flags'], key: string): boolean {
  return flags[key] === true;
}
