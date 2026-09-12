import { join } from 'node:path';
import type { PlatformAdapter } from '../platform/index.js';
import type { BundlePlan } from './plan.js';
import type { BundleRegistry } from './registry.js';
import { parseRegistry, serializeRegistry, upsertRegistryEntry } from './registry.js';

function registryPath(adapter: PlatformAdapter): string {
  return join(adapter.supportDirectory(), 'registry.json');
}

/** Read the current bundle registry through the platform adapter. */
export async function readRegistry(adapter: PlatformAdapter): Promise<BundleRegistry> {
  return parseRegistry(await adapter.readTextFile(registryPath(adapter)));
}

/**
 * Persist the registry as-is — for callers (the CLI's `uninstall`) that
 * remove an entry directly with removeRegistryEntry rather than going
 * through writeBundle's upsert.
 */
export async function writeRegistry(
  adapter: PlatformAdapter,
  registry: BundleRegistry,
): Promise<void> {
  await adapter.writeTextFile(registryPath(adapter), serializeRegistry(registry));
}

export interface WriteBundleInputs {
  readonly projectDir: string;
  readonly devlaunchVersion: string;
}

/**
 * The I/O half of bundle generation: write the plan's files, register the
 * bundle with Spotlight, and record it in the registry — all through the
 * platform adapter, so this stays testable with a fake one.
 */
export async function writeBundle(
  plan: BundlePlan,
  adapter: PlatformAdapter,
  inputs: WriteBundleInputs,
): Promise<void> {
  await adapter.writeBundle({ bundlePath: plan.bundlePath, files: plan.files });

  const registry = await readRegistry(adapter);
  const updated = upsertRegistryEntry(registry, plan.name, {
    projectDir: inputs.projectDir,
    bundlePath: plan.bundlePath,
    devlaunchVersion: inputs.devlaunchVersion,
  });
  await adapter.writeTextFile(registryPath(adapter), serializeRegistry(updated));

  await adapter.registerWithSpotlight(plan.bundlePath);
}
