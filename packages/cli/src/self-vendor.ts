import { readFileSync } from 'node:fs';

/**
 * Reads the CLI's own currently-running script — embedded into every
 * generated bundle as Resources/devlaunch.mjs, so `node devlaunch.mjs
 * report ...` works completely offline (see docs/agent-contract.md). tsup
 * bundles the whole CLI into one file, so `process.argv[1]` (the script
 * Node was actually invoked with, symlinks resolved) correctly points at
 * that single file once built. In dev (unbundled) it just reads
 * src/index.ts instead, which only matters for local testing.
 */
export function readOwnScript(): string {
  const path = process.argv[1];
  if (!path) {
    throw new Error('could not determine the running script path (process.argv[1] is empty)');
  }
  return readFileSync(path, 'utf8');
}
