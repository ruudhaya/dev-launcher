/**
 * @devlaunch/core — pure engine.
 *
 * Boundary rules (see CLAUDE.md):
 *   - Never touches process.stdout / process.stderr.
 *   - Never prompts, never reads argv, never calls process.exit.
 *   - Returns plain data and typed errors; the CLI owns all I/O and presentation.
 *   - Reading the filesystem (detection) is fine; writing to it is not, yet.
 */

export const CORE_VERSION = '0.0.0';

export type {
  DevScriptCandidate,
  FrameworkInfo,
  IconCandidate,
  IconSource,
  ImportedLauncher,
  ImportedRunConfig,
  NodeVersionInfo,
  PackageJsonLike,
  PackageManager,
  ProjectDetection,
  RunConfigImporter,
  WorkspaceApp,
} from './detect/index.js';
export {
  claudeLaunchJsonImporter,
  detectDevScriptCandidates,
  detectFramework,
  detectIconCandidates,
  detectNodeVersion,
  detectPackageManager,
  detectProject,
  detectWorkspaceApps,
  GENERIC_READY_PATTERN,
  parsePortFromCommand,
  pickDevScript,
  RUN_CONFIG_IMPORTERS,
  resolveReadyPattern,
} from './detect/index.js';

export type { DevlaunchErrorCode, ErrorCatalogEntry, ErrorCategory } from './errors/index.js';
export {
  DevlaunchError,
  ERROR_CATALOG,
  generateMarkdownReference,
  generateShellStrings,
  getErrorEntry,
  listErrorEntries,
} from './errors/index.js';

export type { SecretPattern } from './redact/index.js';
export {
  collectSecretValues,
  createRedactor,
  MIN_SECRET_VALUE_LENGTH,
  parseEnvFile,
  redactKnownValues,
  redactPatterns,
  redactText,
  SECRET_PATTERNS,
} from './redact/index.js';
