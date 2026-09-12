import type { LauncherMode } from '../config/index.js';
import type { NodeVersionInfo, PackageManager } from '../detect/index.js';

export interface LauncherEnvInputs {
  readonly projectDir: string;
  readonly name: string;
  /** Filesystem-safe identifier for PID/log/lockhash file names — see slugify(). */
  readonly slug: string;
  readonly script: string | undefined;
  readonly port: number | undefined;
  readonly mode: LauncherMode;
  readonly openPath: string;
  readonly browser: string | undefined;
  readonly readyTimeoutSeconds: number;
  readonly packageManager: PackageManager;
  readonly nodeVersion: NodeVersionInfo | undefined;
  readonly devlaunchVersion: string;
}

function escapeShellValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function envLine(key: string, value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : `${key}="${escapeShellValue(String(value))}"`;
}

/**
 * Resources/launcher.env: the absolute paths and resolved settings the
 * launcher script sources at runtime. Not a runtime template — generated
 * fresh per project. Carries no secrets, only what's already public in the
 * project's own config (see the "generated launchers carry no secrets"
 * principle in CLAUDE.md).
 */
export function generateLauncherEnv(inputs: LauncherEnvInputs): string {
  const lines = [
    envLine('DEVLAUNCH_PROJECT_DIR', inputs.projectDir),
    envLine('DEVLAUNCH_NAME', inputs.name),
    envLine('DEVLAUNCH_SLUG', inputs.slug),
    envLine('DEVLAUNCH_SCRIPT', inputs.script),
    envLine('DEVLAUNCH_PORT', inputs.port),
    envLine('DEVLAUNCH_MODE', inputs.mode),
    envLine('DEVLAUNCH_OPEN_PATH', inputs.openPath),
    envLine('DEVLAUNCH_BROWSER', inputs.browser),
    envLine('DEVLAUNCH_READY_TIMEOUT_SECONDS', inputs.readyTimeoutSeconds),
    envLine('DEVLAUNCH_PACKAGE_MANAGER', inputs.packageManager),
    envLine('DEVLAUNCH_NODE_VERSION', inputs.nodeVersion?.version),
    envLine('DEVLAUNCH_NODE_VERSION_SOURCE', inputs.nodeVersion?.source),
    envLine('DEVLAUNCH_VERSION', inputs.devlaunchVersion),
  ].filter((line): line is string => line !== undefined);

  return `${lines.join('\n')}\n`;
}
