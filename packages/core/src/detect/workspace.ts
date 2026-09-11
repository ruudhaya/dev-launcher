import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageJsonLike, WorkspaceApp } from './types.js';

/**
 * Just enough YAML to read pnpm-workspace.yaml's "packages" list — a flat
 * sequence of quoted or bare glob strings. Not a general YAML parser.
 */
function parsePnpmWorkspacePackages(content: string): string[] {
  const patterns: string[] = [];
  let inPackages = false;

  for (const rawLine of content.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(rawLine)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) {
      continue;
    }
    const item = rawLine.match(/^\s*-\s*(.+?)\s*$/);
    if (!item) {
      if (rawLine.trim() !== '') {
        inPackages = false; // left the "packages:" block
      }
      continue;
    }
    const value = item[1]?.replace(/^['"]|['"]$/g, '').trim();
    if (value) {
      patterns.push(value);
    }
  }

  return patterns;
}

function readWorkspacePatterns(projectDir: string, packageJson: PackageJsonLike): string[] {
  const pnpmWorkspacePath = join(projectDir, 'pnpm-workspace.yaml');
  if (existsSync(pnpmWorkspacePath)) {
    return parsePnpmWorkspacePackages(readFileSync(pnpmWorkspacePath, 'utf8'));
  }

  const { workspaces } = packageJson;
  if (!workspaces) {
    return [];
  }
  if (Array.isArray(workspaces)) {
    return [...workspaces];
  }
  // TS's Array.isArray guard doesn't narrow a ReadonlyArray union cleanly, so
  // reach for "packages" via an explicit cast rather than fighting it here.
  const packages = (workspaces as { readonly packages?: readonly string[] }).packages;
  return Array.isArray(packages) ? [...packages] : [];
}

/**
 * Expand a workspace glob to directories that exist. Only supports an exact
 * path or a single trailing "/*" wildcard — every real workspace layout in
 * examples/ uses one of those two shapes, and core has no dependency on a
 * real glob library.
 */
function expandPattern(projectDir: string, pattern: string): string[] {
  if (!pattern.endsWith('/*')) {
    return existsSync(join(projectDir, pattern)) ? [pattern] : [];
  }

  const base = pattern.slice(0, -2);
  const baseDir = join(projectDir, base);
  if (!existsSync(baseDir)) {
    return [];
  }

  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${base}/${entry.name}`);
}

/** Workspace member apps that have their own package.json, for monorepo launcher selection. */
export function detectWorkspaceApps(
  projectDir: string,
  packageJson: PackageJsonLike,
): WorkspaceApp[] {
  const patterns = readWorkspacePatterns(projectDir, packageJson);
  const dirs = patterns.flatMap((pattern) => expandPattern(projectDir, pattern));

  const apps: WorkspaceApp[] = [];
  for (const dir of dirs) {
    const packageJsonPath = join(projectDir, dir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }
    const appPackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJsonLike;
    apps.push({
      name: appPackageJson.name ?? dir,
      dir,
      devScript: appPackageJson.scripts?.dev,
    });
  }
  return apps;
}
