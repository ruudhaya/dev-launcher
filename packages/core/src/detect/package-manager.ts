import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageJsonLike, PackageManager } from './types.js';

const KNOWN_PACKAGE_MANAGERS: readonly PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];

function isPackageManager(value: string): value is PackageManager {
  return (KNOWN_PACKAGE_MANAGERS as readonly string[]).includes(value);
}

/**
 * Detect the package manager: the explicit "packageManager" field wins, then
 * whichever lockfile is present, then npm as the default for a project with
 * neither.
 */
export function detectPackageManager(
  projectDir: string,
  packageJson: PackageJsonLike,
): PackageManager {
  const field = packageJson.packageManager;
  if (typeof field === 'string') {
    const name = field.split('@')[0]?.trim() ?? '';
    if (isPackageManager(name)) {
      return name;
    }
  }

  if (existsSync(join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectDir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectDir, 'bun.lockb')) || existsSync(join(projectDir, 'bun.lock'))) {
    return 'bun';
  }
  return 'npm';
}
