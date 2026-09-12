/**
 * The registry of launchers devlaunch has generated, persisted as
 * ~/Library/Application Support/devlaunch/registry.json. Parsing/serializing
 * is pure; actual reading and writing goes through the platform adapter (see
 * readRegistry/writeBundle) since only it touches disk.
 */
export interface BundleRegistryEntry {
  readonly projectDir: string;
  readonly bundlePath: string;
  readonly devlaunchVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type BundleRegistry = Readonly<Record<string, BundleRegistryEntry>>;

/** A corrupt or missing registry is treated as empty rather than blocking the whole tool. */
export function parseRegistry(content: string | undefined): BundleRegistry {
  if (!content) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null ? (parsed as BundleRegistry) : {};
  } catch {
    return {};
  }
}

export function serializeRegistry(registry: BundleRegistry): string {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

export function upsertRegistryEntry(
  registry: BundleRegistry,
  name: string,
  entry: Omit<BundleRegistryEntry, 'createdAt' | 'updatedAt'>,
  now: string = new Date().toISOString(),
): BundleRegistry {
  const existing = registry[name];
  return {
    ...registry,
    [name]: {
      ...entry,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}

export function removeRegistryEntry(registry: BundleRegistry, name: string): BundleRegistry {
  const { [name]: _removed, ...rest } = registry;
  return rest;
}
