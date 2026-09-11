import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IconCandidate, IconSource, PackageJsonLike } from './types.js';

const ICON_CONVENTIONS: readonly { relPath: string; source: IconSource }[] = [
  { relPath: 'public/logo.png', source: 'public/logo.png' },
  { relPath: 'public/apple-touch-icon.png', source: 'apple-touch-icon' },
  { relPath: 'apple-touch-icon.png', source: 'apple-touch-icon' },
  { relPath: 'public/favicon.png', source: 'favicon.png' },
  { relPath: 'favicon.png', source: 'favicon.png' },
  { relPath: 'app/icon.png', source: 'app/icon.png' },
];

/**
 * Every icon devlaunch could use, in priority order: an explicitly configured
 * one first (if it actually exists), then the usual framework conventions.
 * The bundle step (later) picks the first candidate and converts it.
 */
export function detectIconCandidates(
  projectDir: string,
  packageJson: PackageJsonLike,
): IconCandidate[] {
  const candidates: IconCandidate[] = [];

  const configured = packageJson.launcher?.icon;
  if (typeof configured === 'string' && existsSync(join(projectDir, configured))) {
    candidates.push({ path: configured, source: 'configured' });
  }

  for (const { relPath, source } of ICON_CONVENTIONS) {
    if (existsSync(join(projectDir, relPath))) {
      candidates.push({ path: relPath, source });
    }
  }

  return candidates;
}
