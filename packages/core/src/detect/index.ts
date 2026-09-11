export type { ProjectDetection } from './detect-project.js';
export { detectProject } from './detect-project.js';
export { detectDevScriptCandidates, parsePortFromCommand, pickDevScript } from './dev-script.js';
export { detectFramework, GENERIC_READY_PATTERN, resolveReadyPattern } from './framework.js';
export { detectIconCandidates } from './icons.js';
export type {
  ImportedLauncher,
  ImportedRunConfig,
  RunConfigImporter,
} from './importers/index.js';
export {
  claudeLaunchJsonImporter,
  RUN_CONFIG_IMPORTERS,
} from './importers/index.js';
export { detectNodeVersion } from './node-version.js';
export { detectPackageManager } from './package-manager.js';
export type {
  DevScriptCandidate,
  FrameworkInfo,
  IconCandidate,
  IconSource,
  NodeVersionInfo,
  PackageJsonLike,
  PackageManager,
  WorkspaceApp,
} from './types.js';
export { detectWorkspaceApps } from './workspace.js';
