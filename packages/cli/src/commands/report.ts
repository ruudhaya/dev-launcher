import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DevlaunchErrorCode, PackageJsonLike } from '@devlaunch/core';
import {
  buildReport,
  detectNodeVersion,
  detectPackageManager,
  ERROR_CATALOG,
  getErrorEntry,
} from '@devlaunch/core';
import type { ParsedArgs } from '../argv.js';
import { flagBoolean, flagString } from '../argv.js';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { errEnvelope, okEnvelope } from '../envelope.js';
import { buildReportEnvironment } from '../environment.js';
import { EXIT_CODES } from '../exit-codes.js';
import { findLauncher, launcherRuntimeInfo, readLauncherEnv } from '../launcher-lookup.js';
import { launcherNotFoundResult } from '../not-found.js';
import { collectProjectSecretValues } from '../project-secrets.js';

function isKnownErrorCode(code: string): code is DevlaunchErrorCode {
  return code in ERROR_CATALOG;
}

function readLogLines(path: string | undefined): string[] {
  if (!path) return [];
  try {
    return readFileSync(path, 'utf8').split('\n');
  } catch {
    return [];
  }
}

function readPackageJson(projectDir: string): PackageJsonLike {
  try {
    return JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8')) as PackageJsonLike;
  } catch {
    return {};
  }
}

/**
 * `devlaunch report` serves two callers with one implementation:
 *
 *  - A person or agent: `report [name] [--clipboard] [--json]` (the
 *    documented, interactive form — see docs/agent-contract.md), which looks
 *    up a registered launcher's current state.
 *  - The vendored copy embedded in every bundle, invoked by launcher.sh's
 *    Copy Report as `devlaunch.mjs report --clipboard --code <code>
 *    --project-dir <dir> --log-file <file>` — offline, with no registry
 *    lookup, since the launcher already knows exactly what happened.
 */
export async function runReport(ctx: CliContext, args: ParsedArgs): Promise<CommandResult> {
  const clipboard = flagBoolean(args.flags, 'clipboard');
  const codeFlag = flagString(args.flags, 'code');
  const projectDirFlag = flagString(args.flags, 'project-dir');
  const logFileFlag = flagString(args.flags, 'log-file');

  if (codeFlag !== undefined && !isKnownErrorCode(codeFlag)) {
    return {
      envelope: errEnvelope('CONFIG_INVALID', `Unknown error code "${codeFlag}".`),
      exitCode: EXIT_CODES.USAGE,
    };
  }

  let report: string;
  let name: string | undefined;

  if (codeFlag !== undefined || projectDirFlag !== undefined || logFileFlag !== undefined) {
    // Internal/vendored form.
    const projectDir = projectDirFlag ?? ctx.cwd;
    const packageJson = readPackageJson(projectDir);
    const packageManager = detectPackageManager(projectDir, packageJson);
    const nodeVersion = detectNodeVersion(projectDir, packageJson);
    const errorCode = codeFlag as DevlaunchErrorCode | undefined;

    report = buildReport({
      summary: errorCode ? getErrorEntry(errorCode).title : `Diagnostic report for ${projectDir}.`,
      errorCode,
      stepsAttempted: [],
      environment: buildReportEnvironment({
        devlaunchVersion: ctx.devlaunchVersion,
        packageManager,
        nodeVersion: nodeVersion?.version,
        nodeVersionSource: nodeVersion?.source,
      }),
      config: { projectDir },
      logLines: readLogLines(logFileFlag),
      secretValues: collectProjectSecretValues(projectDir),
    });
  } else {
    name = args.positionals[0];
    const lookup = await findLauncher(ctx.adapter, name, ctx.cwd);
    if (!lookup) {
      return launcherNotFoundResult(name, ctx.cwd);
    }

    const info = launcherRuntimeInfo(ctx.adapter, lookup);
    const env = readLauncherEnv(lookup.entry.bundlePath);
    const summary = info.running
      ? `"${lookup.name}" is running (pid ${info.pid}, port ${info.port ?? 'unknown'}).`
      : `"${lookup.name}" is not running.`;

    report = buildReport({
      summary,
      stepsAttempted: [],
      environment: buildReportEnvironment({
        devlaunchVersion: ctx.devlaunchVersion,
        packageManager: env.DEVLAUNCH_PACKAGE_MANAGER ?? 'npm',
        nodeVersion: env.DEVLAUNCH_NODE_VERSION,
        nodeVersionSource: env.DEVLAUNCH_NODE_VERSION_SOURCE,
      }),
      config: {
        name: lookup.name,
        projectDir: lookup.entry.projectDir,
        port: info.port,
        mode: env.DEVLAUNCH_MODE,
      },
      logLines: readLogLines(info.logFile),
      secretValues: collectProjectSecretValues(lookup.entry.projectDir),
    });
    name = lookup.name;
  }

  if (clipboard) {
    await ctx.copyToClipboard(report);
  }

  const message = clipboard
    ? `Copied the report${name ? ` for "${name}"` : ''}.`
    : `Report${name ? ` for "${name}"` : ''}.`;

  return {
    envelope: okEnvelope(message, { name: name ?? null, report }),
    exitCode: EXIT_CODES.OK,
    plainLines: clipboard ? [message] : [report],
  };
}
