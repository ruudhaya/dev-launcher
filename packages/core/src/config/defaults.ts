import { basename } from 'node:path';
import type { ProjectDetection } from '../detect/index.js';
import type { LauncherConfigFields, LauncherMode } from './types.js';

export const DEFAULT_MODE: LauncherMode = 'terminal';
export const DEFAULT_OPEN_PATH = '/';
export const DEFAULT_READY_TIMEOUT_SECONDS = 90;

/** Drop an npm scope and turn path separators into dashes: "@acme/web" -> "acme-web". */
function sanitizeName(name: string): string {
  return name.replace(/^@/, '').replaceAll('/', '-').trim();
}

/**
 * The lowest-precedence config layer, built entirely from detection — no
 * project opinion involved yet. `packageJsonName` lets a caller that already
 * parsed package.json pass its "name" straight through; otherwise this falls
 * back to what detection found, then the project directory's basename.
 */
export function buildDefaultsFromDetection(
  detection: ProjectDetection,
  packageJsonName?: string,
): LauncherConfigFields {
  const rawName = packageJsonName ?? detection.projectName ?? basename(detection.projectDir);
  return {
    name: sanitizeName(rawName),
    script: detection.devScript?.name,
    port: detection.port,
    mode: DEFAULT_MODE,
    icon: detection.iconCandidates[0]?.path,
    openPath: DEFAULT_OPEN_PATH,
    readyTimeoutSeconds: DEFAULT_READY_TIMEOUT_SECONDS,
  };
}
