import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NodeVersionInfo, PackageJsonLike } from './types.js';

/** Precedence: .nvmrc > .node-version > "volta.node" > "engines.node". */
export function detectNodeVersion(
  projectDir: string,
  packageJson: PackageJsonLike,
): NodeVersionInfo | undefined {
  const nvmrc = readTrimmedFile(join(projectDir, '.nvmrc'));
  if (nvmrc) {
    return { version: nvmrc, source: 'nvmrc' };
  }

  const nodeVersionFile = readTrimmedFile(join(projectDir, '.node-version'));
  if (nodeVersionFile) {
    return { version: nodeVersionFile, source: 'node-version' };
  }

  if (packageJson.volta?.node) {
    return { version: packageJson.volta.node, source: 'volta' };
  }

  if (packageJson.engines?.node) {
    return { version: packageJson.engines.node, source: 'engines' };
  }

  return undefined;
}

function readTrimmedFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const content = readFileSync(path, 'utf8').trim();
  return content.length > 0 ? content : undefined;
}
