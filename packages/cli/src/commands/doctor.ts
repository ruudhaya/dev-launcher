import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageJsonLike } from '@devlaunch/core';
import {
  buildDefaultsFromDetection,
  DevlaunchError,
  detectNodeVersion,
  detectProject,
  getErrorEntry,
  resolveConfig,
} from '@devlaunch/core';
import type { CommandResult } from '../command-result.js';
import type { CliContext } from '../context.js';
import { errEnvelope, okEnvelope } from '../envelope.js';
import { macosVersion } from '../environment.js';
import { EXIT_CODES } from '../exit-codes.js';
import { isConfigArray } from '../is-config-array.js';
import { findLauncher, launcherRuntimeInfo, listLaunchers } from '../launcher-lookup.js';
import { isProcessAlive } from '../process-utils.js';

interface DoctorCheck {
  readonly name: string;
  readonly ok: boolean;
  /** A catalog code when one really fits; null for checks the catalog has no single code for. */
  readonly code: string | null;
  readonly hint: string | null;
  readonly detail?: unknown;
}

function readPackageJson(dir: string): PackageJsonLike | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJsonLike;
  } catch {
    return undefined;
  }
}

function checkMacosVersion(): DoctorCheck {
  const version = macosVersion();
  return version
    ? { name: 'macos-version', ok: true, code: null, hint: null, detail: version }
    : {
        name: 'macos-version',
        ok: false,
        code: 'DEVLAUNCH_BUG',
        hint: 'Could not run `sw_vers -productVersion`.',
      };
}

function loginShellNodeVersion(): string | undefined {
  try {
    return execFileSync('zsh', ['-lc', 'node --version'], { encoding: 'utf8' })
      .trim()
      .replace(/^v/, '');
  } catch {
    return undefined;
  }
}

function checkNodeLoginShell(loginVersion: string | undefined): DoctorCheck {
  if (!loginVersion) {
    const entry = getErrorEntry('NODE_NOT_FOUND');
    return { name: 'node-login-shell', ok: false, code: entry.code, hint: entry.agentHint };
  }
  const current = process.version.replace(/^v/, '');
  return {
    name: 'node-login-shell',
    ok: true,
    code: null,
    hint:
      loginVersion === current
        ? null
        : `Login-shell Node is v${loginVersion}; devlaunch is currently running under v${current}. ` +
          'That is fine — launcher.sh always starts dev servers under the login shell.',
    detail: loginVersion,
  };
}

/** Only runs when cwd looks like a project asking for a specific Node version. */
function checkProjectNodeVersion(
  cwd: string,
  loginVersion: string | undefined,
): DoctorCheck | undefined {
  const packageJson = readPackageJson(cwd);
  if (!packageJson) return undefined;

  const requested = detectNodeVersion(cwd, packageJson);
  if (!requested) return undefined;

  if (!loginVersion) {
    const entry = getErrorEntry('NODE_NOT_FOUND');
    return {
      name: 'node-project-version',
      ok: false,
      code: entry.code,
      hint:
        `This project requests Node ${requested.version} (from ${requested.source}), but no ` +
        `Node was found in the login shell. ${entry.agentHint}`,
    };
  }

  // Only a fully concrete version ("20.11.0") can be compared exactly; ranges
  // and majors ("^18", "20") are left as ok — a real semver check is more
  // machinery than this diagnostic needs right now.
  const isExact = /^\d+\.\d+\.\d+$/.test(requested.version);
  if (isExact && requested.version !== loginVersion) {
    const entry = getErrorEntry('NODE_VERSION_MISSING');
    return {
      name: 'node-project-version',
      ok: false,
      code: entry.code,
      hint:
        `This project requests Node ${requested.version} (from ${requested.source}); the login ` +
        `shell has ${loginVersion}. ${entry.agentHint}`,
    };
  }

  return {
    name: 'node-project-version',
    ok: true,
    code: null,
    hint: null,
    detail: requested.version,
  };
}

function checkSpotlightIndexing(bundleLocation: string): DoctorCheck {
  try {
    const out = execFileSync('mdutil', ['-s', bundleLocation], { encoding: 'utf8' });
    if (/disabled|not indexed/i.test(out)) {
      const entry = getErrorEntry('SPOTLIGHT_NOT_INDEXING');
      return { name: 'spotlight-indexing', ok: false, code: entry.code, hint: entry.agentHint };
    }
    return { name: 'spotlight-indexing', ok: true, code: null, hint: null };
  } catch {
    // mdutil can fail for reasons unrelated to indexing (e.g. sandboxing) —
    // don't fail doctor over a check that couldn't run.
    return {
      name: 'spotlight-indexing',
      ok: true,
      code: null,
      hint: 'Could not check Spotlight indexing status (`mdutil` failed) — assuming it is fine.',
    };
  }
}

/** Only runs when cwd looks like a project — resolves its launcher config the same way `init` would. */
function checkConfigValidity(cwd: string): DoctorCheck | undefined {
  const packageJson = readPackageJson(cwd);
  if (!packageJson) return undefined;

  try {
    const detection = detectProject(cwd);
    const defaults = buildDefaultsFromDetection(detection, packageJson.name);
    resolveConfig({ defaults, packageJsonLauncher: packageJson.launcher });
    return { name: 'config-validity', ok: true, code: null, hint: null };
  } catch (error) {
    if (error instanceof DevlaunchError) {
      return {
        name: 'config-validity',
        ok: false,
        code: error.code,
        hint: getErrorEntry(error.code).agentHint,
      };
    }
    return {
      name: 'config-validity',
      ok: false,
      code: 'DEVLAUNCH_BUG',
      hint: error instanceof Error ? error.message : String(error),
    };
  }
}

function findListeningPid(port: number): number | undefined {
  try {
    const out = execFileSync('lsof', ['-ti', `:${port}`, '-sTCP:LISTEN'], {
      encoding: 'utf8',
    }).trim();
    const pid = Number.parseInt(out.split('\n')[0] ?? '', 10);
    return Number.isInteger(pid) ? pid : undefined;
  } catch {
    return undefined; // lsof exits non-zero when nothing is listening
  }
}

/** Only runs when cwd's config resolves cleanly to a single app with a port. */
async function checkPortAvailability(ctx: CliContext): Promise<DoctorCheck | undefined> {
  const packageJson = readPackageJson(ctx.cwd);
  if (!packageJson) return undefined;

  let port: number | undefined;
  try {
    const detection = detectProject(ctx.cwd);
    const defaults = buildDefaultsFromDetection(detection, packageJson.name);
    const resolved = resolveConfig({ defaults, packageJsonLauncher: packageJson.launcher });
    // An array result is an ambiguous monorepo with no single app to check — skip.
    if (!isConfigArray(resolved)) {
      port = resolved.port;
    }
  } catch {
    return undefined; // config-validity already reports this
  }
  if (!port) return undefined;

  const listeningPid = findListeningPid(port);
  if (!listeningPid) {
    return {
      name: 'port-availability',
      ok: true,
      code: null,
      hint: null,
      detail: `port ${port} is free`,
    };
  }

  const ownLauncher = await findLauncher(ctx.adapter, undefined, ctx.cwd);
  if (ownLauncher) {
    const info = launcherRuntimeInfo(ctx.adapter, ownLauncher);
    if (info.pid === listeningPid) {
      return {
        name: 'port-availability',
        ok: true,
        code: null,
        hint: null,
        detail: `port ${port} is in use by this project's own launcher (pid ${listeningPid})`,
      };
    }
  }

  const entry = getErrorEntry('PORT_IN_USE');
  return {
    name: 'port-availability',
    ok: false,
    code: entry.code,
    hint: entry.agentHint,
    detail: `port ${port} is in use by pid ${listeningPid}`,
  };
}

async function checkStaleLaunchers(ctx: CliContext): Promise<DoctorCheck> {
  const lookups = await listLaunchers(ctx.adapter);
  const stale = lookups.filter((l) => !existsSync(l.entry.bundlePath)).map((l) => l.name);
  return stale.length === 0
    ? { name: 'stale-launchers', ok: true, code: null, hint: null }
    : {
        name: 'stale-launchers',
        ok: false,
        code: null,
        hint:
          `${stale.join(', ')} ${stale.length === 1 ? 'is' : 'are'} registered but the .app is gone ` +
          `— run \`devlaunch uninstall ${stale.length === 1 ? stale[0] : '<name>'}\` to clean up.`,
        detail: stale,
      };
}

function checkStalePidFiles(ctx: CliContext): DoctorCheck {
  let entries: string[] = [];
  try {
    entries = readdirSync(ctx.adapter.runDirectory());
  } catch {
    entries = [];
  }

  const stale = entries.filter((entry) => {
    if (!entry.endsWith('.pid')) return false;
    let pid: number | undefined;
    try {
      pid = Number.parseInt(
        readFileSync(join(ctx.adapter.runDirectory(), entry), 'utf8').trim(),
        10,
      );
    } catch {
      pid = undefined;
    }
    return pid === undefined || !Number.isInteger(pid) || !isProcessAlive(pid);
  });

  return {
    name: 'stale-pid-files',
    ok: true, // self-heals on next launch — informational, not a failure
    code: null,
    hint:
      stale.length === 0
        ? null
        : `${stale.join(', ')} ${stale.length === 1 ? 'refers' : 'refer'} to a process that is no ` +
          'longer running — harmless, the next launch cleans it up automatically.',
    detail: stale,
  };
}

export async function runDoctor(ctx: CliContext): Promise<CommandResult> {
  const loginVersion = loginShellNodeVersion();

  const checks = [
    checkMacosVersion(),
    checkNodeLoginShell(loginVersion),
    checkProjectNodeVersion(ctx.cwd, loginVersion),
    checkSpotlightIndexing(ctx.adapter.bundleLocation()),
    checkConfigValidity(ctx.cwd),
    await checkPortAvailability(ctx),
    await checkStaleLaunchers(ctx),
    checkStalePidFiles(ctx),
  ].filter((check): check is DoctorCheck => check !== undefined);

  const failures = checks.filter((c) => !c.ok);
  const allOk = failures.length === 0;

  const code = allOk ? 'OK' : (failures.find((f) => f.code)?.code ?? 'DEVLAUNCH_BUG');
  const message = allOk
    ? `All ${checks.length} checks passed.`
    : `${failures.length} of ${checks.length} checks failed.`;
  const hint = allOk ? null : (failures[0]?.hint ?? null);

  const plainLines = [
    message,
    ...checks.map((c) => `  ${c.ok ? '✓' : '✗'} ${c.name}${c.hint ? ` — ${c.hint}` : ''}`),
  ];

  const envelope = allOk
    ? okEnvelope(message, { checks })
    : errEnvelope(code, message, hint, { checks });

  return { envelope, exitCode: allOk ? EXIT_CODES.OK : EXIT_CODES.ENVIRONMENT, plainLines };
}
