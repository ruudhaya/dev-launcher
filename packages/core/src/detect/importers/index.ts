import { claudeLaunchJsonImporter } from './claude-launch-json.js';
import type { RunConfigImporter } from './types.js';

/** Every run-config importer devlaunch knows about, checked in order. */
export const RUN_CONFIG_IMPORTERS: readonly RunConfigImporter[] = [claudeLaunchJsonImporter];

export type { ImportedLauncher, ImportedRunConfig, RunConfigImporter } from './types.js';
export { claudeLaunchJsonImporter };
