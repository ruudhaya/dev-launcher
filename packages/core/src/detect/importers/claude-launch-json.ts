/**
 * Imports `.claude/launch.json`, the run configuration the Claude Code
 * desktop app writes for its own Preview pane ("Configure preview servers").
 *
 * Format confirmed against https://code.claude.com/docs/en/desktop, checked
 * 2026-09-12. Relevant shape at that date:
 *
 *   {
 *     "version": "0.0.1",
 *     "configurations": [
 *       {
 *         "name": "frontend",
 *         "runtimeExecutable": "npm",
 *         "runtimeArgs": ["run", "dev"],
 *         "cwd": "apps/web",
 *         "port": 3000
 *       }
 *     ]
 *   }
 *
 * `runtimeExecutable`/`runtimeArgs` is one way to say "how to start this
 * server"; `program`/`args` (run with `node`) is the other. `cwd` is relative
 * to the project root and defaults to it; `${workspaceFolder}` is documented
 * as an explicit way to reference that root. `port` defaults to 3000 per the
 * docs. The file also supports JS-style comments, which is why we can't just
 * JSON.parse it directly.
 *
 * devlaunch only ever reads this file — never writes or modifies it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DevlaunchError } from '../../errors/index.js';
import type { ImportedLauncher, ImportedRunConfig, RunConfigImporter } from './types.js';

const SOURCE = '.claude/launch.json';

interface ClaudeLaunchConfiguration {
  readonly name?: unknown;
  readonly runtimeExecutable?: unknown;
  readonly runtimeArgs?: unknown;
  readonly program?: unknown;
  readonly args?: unknown;
  readonly port?: unknown;
  readonly cwd?: unknown;
}

interface ClaudeLaunchJson {
  readonly configurations?: unknown;
}

/** Strip `//` and `/* *\/` comments outside of string literals so JSON.parse can read the file. */
function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  let quote = '';

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    const next = text[i + 1];

    if (inString) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 1;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') {
        i += 1;
      }
      out += '\n';
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        i += 1;
      }
      i += 1;
      continue;
    }

    out += ch;
  }

  return out;
}

function buildCommand(config: ClaudeLaunchConfiguration): string | undefined {
  if (typeof config.runtimeExecutable === 'string' && config.runtimeExecutable.length > 0) {
    const args = Array.isArray(config.runtimeArgs) ? config.runtimeArgs.map(String) : [];
    return [config.runtimeExecutable, ...args].join(' ');
  }
  if (typeof config.program === 'string' && config.program.length > 0) {
    const args = Array.isArray(config.args) ? config.args.map(String) : [];
    return ['node', config.program, ...args].join(' ');
  }
  return undefined;
}

function resolveCwd(cwd: unknown): string {
  if (typeof cwd !== 'string' || cwd.trim().length === 0) {
    return '.';
  }
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal token from launch.json's own format, not a JS template.
  const resolved = cwd.replaceAll('${workspaceFolder}', '.').replace(/\/+$/, '');
  return resolved.length > 0 ? resolved : '.';
}

function toImportedLauncher(
  config: ClaudeLaunchConfiguration,
  index: number,
): ImportedLauncher | undefined {
  const command = buildCommand(config);
  if (!command) {
    return undefined;
  }
  const name =
    typeof config.name === 'string' && config.name.length > 0 ? config.name : `server-${index + 1}`;
  const port = typeof config.port === 'number' ? config.port : undefined;
  return { name, command, cwd: resolveCwd(config.cwd), port };
}

export const claudeLaunchJsonImporter: RunConfigImporter = {
  source: SOURCE,
  detect(projectDir: string): ImportedRunConfig | undefined {
    const path = join(projectDir, '.claude', 'launch.json');
    if (!existsSync(path)) {
      return undefined;
    }

    let parsed: ClaudeLaunchJson;
    try {
      parsed = JSON.parse(stripJsonComments(readFileSync(path, 'utf8'))) as ClaudeLaunchJson;
    } catch (cause) {
      throw new DevlaunchError('RUN_CONFIG_INVALID', `${SOURCE} is not valid JSON`, { cause });
    }

    if (!Array.isArray(parsed.configurations) || parsed.configurations.length === 0) {
      throw new DevlaunchError('RUN_CONFIG_INVALID', `${SOURCE} has no "configurations" array`);
    }

    const launchers = (parsed.configurations as ClaudeLaunchConfiguration[])
      .map(toImportedLauncher)
      .filter((launcher): launcher is ImportedLauncher => launcher !== undefined);

    if (launchers.length === 0) {
      throw new DevlaunchError(
        'RUN_CONFIG_INVALID',
        `${SOURCE} has no configuration with a "runtimeExecutable" or "program"`,
      );
    }

    return { source: SOURCE, launchers };
  },
};
