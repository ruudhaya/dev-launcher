import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DevlaunchError } from '../errors/index.js';
import { detectDevScriptCandidates, parsePortFromCommand, pickDevScript } from './dev-script.js';
import { detectFramework } from './framework.js';
import { detectIconCandidates } from './icons.js';
import type { ImportedRunConfig } from './importers/index.js';
import { RUN_CONFIG_IMPORTERS } from './importers/index.js';
import { detectNodeVersion } from './node-version.js';
import { detectPackageManager } from './package-manager.js';
import type {
  DevScriptCandidate,
  FrameworkInfo,
  IconCandidate,
  NodeVersionInfo,
  PackageJsonLike,
  PackageManager,
  WorkspaceApp,
} from './types.js';
import { detectWorkspaceApps } from './workspace.js';

export interface ProjectDetection {
  readonly projectDir: string;
  /** package.json's own "name" field, if it has one — config uses this as a naming default. */
  readonly projectName: string | undefined;
  readonly packageManager: PackageManager;
  readonly devScriptCandidates: readonly DevScriptCandidate[];
  /** The best-guess dev script — undefined if only an imported run config supplies one. */
  readonly devScript: DevScriptCandidate | undefined;
  readonly framework: FrameworkInfo | undefined;
  /** Best-guess port: an explicit CLI flag beats an imported config beats the framework default. */
  readonly port: number | undefined;
  readonly nodeVersion: NodeVersionInfo | undefined;
  readonly workspaceApps: readonly WorkspaceApp[];
  readonly iconCandidates: readonly IconCandidate[];
  readonly importedRunConfig: ImportedRunConfig | undefined;
  /**
   * Where the launcher's command/port opinion came from, for the CLI to show
   * the user ("from .claude/launch.json"). "heuristic" means package.json +
   * framework conventions with no imported run config involved.
   *
   * This is about detection's own opinion only. Full precedence (used by the
   * config step): an explicit `launcher` field in package.json or
   * .devlaunch.local.json > an imported run config > this heuristic.
   */
  readonly source: 'heuristic' | ImportedRunConfig['source'];
}

function readPackageJson(projectDir: string): PackageJsonLike {
  const path = join(projectDir, 'package.json');
  if (!existsSync(path)) {
    throw new DevlaunchError('NO_PACKAGE_JSON', `No package.json found at ${projectDir}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageJsonLike;
  } catch (cause) {
    throw new DevlaunchError('CONFIG_INVALID', `${path} is not valid JSON`, { cause });
  }
}

function importRunConfig(projectDir: string): ImportedRunConfig | undefined {
  for (const importer of RUN_CONFIG_IMPORTERS) {
    const result = importer.detect(projectDir);
    if (result) {
      return result;
    }
  }
  return undefined;
}

/**
 * Detect everything devlaunch needs to know about a project: package manager,
 * dev script, framework, port, Node version, workspace apps, icon candidates,
 * and any importable run config (currently `.claude/launch.json`).
 *
 * Throws NO_PACKAGE_JSON / CONFIG_INVALID / NO_DEV_SCRIPT / RUN_CONFIG_INVALID
 * (see the error catalog) rather than returning a half-populated result.
 */
export function detectProject(projectDir: string): ProjectDetection {
  const packageJson = readPackageJson(projectDir);
  const importedRunConfig = importRunConfig(projectDir);

  const devScriptCandidates = detectDevScriptCandidates(packageJson.scripts);
  const devScript = pickDevScript(devScriptCandidates);

  if (!devScript && !importedRunConfig) {
    throw new DevlaunchError(
      'NO_DEV_SCRIPT',
      `No "dev"/"start"/"develop"/"serve" script in ${join(projectDir, 'package.json')}, ` +
        'and no .claude/launch.json to import from.',
    );
  }

  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const framework = detectFramework(deps);

  const primaryImportedLauncher = importedRunConfig?.launchers[0];
  const port =
    (devScript && parsePortFromCommand(devScript.command)) ??
    primaryImportedLauncher?.port ??
    framework?.defaultPort;

  return {
    projectDir,
    projectName: packageJson.name,
    packageManager: detectPackageManager(projectDir, packageJson),
    devScriptCandidates,
    devScript,
    framework,
    port,
    nodeVersion: detectNodeVersion(projectDir, packageJson),
    workspaceApps: detectWorkspaceApps(projectDir, packageJson),
    iconCandidates: detectIconCandidates(projectDir, packageJson),
    importedRunConfig,
    source: importedRunConfig?.source ?? 'heuristic',
  };
}
