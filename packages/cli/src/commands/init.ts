import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectDetection, ResolvedLauncherConfig } from '@devlaunch/core';
import {
  buildDefaultsFromDetection,
  detectProject,
  planBundle,
  readRegistry,
  resolveConfig,
  resolveIcon,
  writeBundle,
} from '@devlaunch/core';
import type { ParsedArgs } from '../argv.js';
import { flagString } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { envelopeFromError, errEnvelope, okEnvelope } from '../envelope.js';
import { EXIT_CODES, exitCodeForError } from '../exit-codes.js';
import {
  DEFAULT_ICON_BASE64,
  INFO_PLIST_TEMPLATE,
  LAUNCHER_SCRIPT_TEMPLATE,
  STRINGS_TEMPLATE,
} from '../generated/runtime-assets.js';
import { isConfigArray } from '../is-config-array.js';
import { promptChoice, promptYesNo } from '../process-utils.js';
import { readOwnScript } from '../self-vendor.js';

interface PackageJsonLike {
  readonly name?: string;
  readonly launcher?: unknown;
}

function readPackageJson(projectDir: string): PackageJsonLike {
  return JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8')) as PackageJsonLike;
}

/**
 * The full shell command to run. config.script names an npm script; a
 * project with none of its own (only an imported .claude/launch.json run
 * config) has no script name to build "<packageManager> run <script>" from.
 */
function resolveCommand(detection: ProjectDetection, config: ResolvedLauncherConfig): string {
  if (config.script) {
    return `${detection.packageManager} run ${config.script}`;
  }
  const imported = detection.importedRunConfig?.launchers[0]?.command;
  if (imported) {
    return imported;
  }
  // detectProject already guarantees a script or an imported command exists.
  throw new Error(`${detection.projectDir}: no script and no imported run config to run`);
}

interface InitResultEntry {
  readonly name: string;
  readonly slug: string;
  readonly bundlePath: string;
  readonly port: number | undefined;
  readonly mode: string;
  readonly source: string;
  readonly replacingInPlace: boolean;
}

export async function runInit(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const projectDir = ctx.cwd;
  const nameFlag = flagString(args.flags, 'name');
  const modeFlag = flagString(args.flags, 'mode');

  if (modeFlag && modeFlag !== 'terminal' && modeFlag !== 'headless') {
    return {
      envelope: errEnvelope('CONFIG_INVALID', '--mode must be "terminal" or "headless".'),
      exitCode: EXIT_CODES.USAGE,
    };
  }

  let detection: ProjectDetection;
  try {
    detection = detectProject(projectDir);
  } catch (error) {
    return { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
  }

  let packageJson: PackageJsonLike;
  try {
    packageJson = readPackageJson(projectDir);
  } catch (error) {
    return { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
  }

  const defaults = buildDefaultsFromDetection(detection, packageJson.name);

  let resolved: ResolvedLauncherConfig | readonly ResolvedLauncherConfig[];
  try {
    resolved = resolveConfig({
      defaults,
      packageJsonLauncher: packageJson.launcher,
      // --name is deliberately not passed through here: resolveConfig applies
      // flags uniformly across every array entry (see its own doc comment),
      // so a --name meant to *pick* one monorepo app would instead stamp
      // every entry with the same name before we ever get to filter by it.
      // Picking is a CLI concern (below); for a single (non-array) config we
      // still treat --name as a rename, just applied directly afterward.
      flags: modeFlag ? { mode: modeFlag } : {},
    });
  } catch (error) {
    return { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
  }

  let configs: readonly ResolvedLauncherConfig[];
  if (!isConfigArray(resolved)) {
    configs = [nameFlag ? { ...resolved, name: nameFlag } : resolved];
  } else if (nameFlag) {
    configs = resolved.filter((c) => c.name === nameFlag);
    if (configs.length === 0) {
      const apps = resolved.map((c) => c.name);
      return {
        envelope: errEnvelope(
          'CONFIG_INVALID',
          `No app named "${nameFlag}" in this monorepo's launcher config.`,
          `Choose one of: ${apps.join(', ')}.`,
          { apps },
        ),
        exitCode: EXIT_CODES.NEEDS_USER,
      };
    }
  } else if (resolved.length === 1) {
    configs = resolved;
  } else {
    // More than one launchable app and nothing picking one — see
    // docs/agent-contract.md's init section.
    const apps = resolved.map((c) => c.name);
    const picked = ctx.interactive
      ? await promptChoice('Which app do you want a launcher for?', apps)
      : undefined;
    if (picked === undefined) {
      return {
        envelope: errEnvelope(
          'CONFIG_INVALID',
          `This is a monorepo with ${resolved.length} launchable apps.`,
          `Pass --name <app> to pick one: ${apps.join(', ')}.`,
          { apps },
        ),
        exitCode: EXIT_CODES.NEEDS_USER,
      };
    }
    configs = resolved.filter((c) => c.name === picked);
  }

  const defaultIcon = Buffer.from(DEFAULT_ICON_BASE64, 'base64');
  const vendoredCli = readOwnScript();
  const results: InitResultEntry[] = [];

  for (const config of configs) {
    let command: string;
    try {
      command = resolveCommand(detection, config);
    } catch (error) {
      return { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
    }

    const icon = await resolveIcon(
      { candidates: detection.iconCandidates, projectDir, defaultIcon },
      ctx.adapter,
    );

    const registry = await readRegistry(ctx.adapter);

    let plan: ReturnType<typeof planBundle>;
    try {
      plan = planBundle(
        {
          config,
          command,
          projectDir,
          packageManager: detection.packageManager,
          nodeVersion: detection.nodeVersion,
          devlaunchVersion: ctx.devlaunchVersion,
          infoPlistTemplate: INFO_PLIST_TEMPLATE,
          launcherScriptTemplate: LAUNCHER_SCRIPT_TEMPLATE,
          stringsTemplate: STRINGS_TEMPLATE,
          vendoredCli,
          icon,
        },
        { bundleLocation: ctx.adapter.bundleLocation(), registry },
      );
    } catch (error) {
      return { envelope: envelopeFromError(error), exitCode: exitCodeForError(error) };
    }

    if (!ctx.dryRun) {
      await writeBundle(plan, ctx.adapter, { projectDir, devlaunchVersion: ctx.devlaunchVersion });
    }

    results.push({
      name: plan.name,
      slug: plan.slug,
      bundlePath: plan.bundlePath,
      port: config.port,
      mode: config.mode,
      source: detection.source,
      replacingInPlace: plan.replacingInPlace,
    });
  }

  const first = results[0];
  if (!first) {
    return {
      envelope: errEnvelope('CONFIG_INVALID', 'Nothing to generate.'),
      exitCode: EXIT_CODES.USAGE,
    };
  }

  const verb = ctx.dryRun ? 'Would generate' : 'Generated';
  const noun = results.length === 1 ? `launcher "${first.name}"` : `${results.length} launchers`;
  const message = `${verb} ${noun}.`;

  const plainLines: string[] = [message];
  if (!ctx.dryRun) {
    for (const r of results) {
      plainLines.push(`  ${r.name} → ${r.bundlePath}`);
      plainLines.push(`  Press ⌘ Space and type "${r.name}" to open it.`);
    }

    if (ctx.interactive && results.length === 1) {
      const tryNow = await promptYesNo('Try it now?', true);
      if (tryNow) {
        await ctx.adapter.openUrl(first.bundlePath);
        plainLines.push(`  Opening "${first.name}"…`);
      }
    }
  }

  return {
    envelope: okEnvelope(message, { launchers: results }),
    exitCode: EXIT_CODES.OK,
    plainLines,
  };
}
