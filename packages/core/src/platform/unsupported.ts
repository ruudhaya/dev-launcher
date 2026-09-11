import { DevlaunchError } from '../errors/index.js';
import type { PlatformAdapter } from './types.js';

function unsupported(): never {
  throw new DevlaunchError(
    'PLATFORM_UNSUPPORTED',
    'devlaunch generates macOS apps and only runs on macOS.',
  );
}

/**
 * Every method throws PLATFORM_UNSUPPORTED. The CLI checks the platform and
 * exits cleanly with a friendly message long before it would ever reach one
 * of these — this adapter exists so that invariant is enforced here too,
 * not just hoped for at the call site.
 */
export function createUnsupportedPlatformAdapter(): PlatformAdapter {
  return {
    platform: 'unsupported',
    bundleLocation: unsupported,
    supportDirectory: unsupported,
    logsDirectory: unsupported,
    runDirectory: unsupported,
    writeBundle: async () => unsupported(),
    registerWithSpotlight: async () => unsupported(),
    isIndexedBySpotlight: async () => unsupported(),
    showDialog: async () => unsupported(),
    showNotification: async () => unsupported(),
    openUrl: async () => unsupported(),
    revealInFinder: async () => unsupported(),
  };
}
