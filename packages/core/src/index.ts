/**
 * @devlaunch/core — pure engine.
 *
 * Boundary rules (see CLAUDE.md):
 *   - Never touches process.stdout / process.stderr.
 *   - Never prompts, never reads argv, never calls process.exit.
 *   - Returns plain data and typed errors; the CLI owns all I/O and presentation.
 *   - Reading the filesystem (detection) is fine anywhere in here. Writing to
 *     it, spawning a process, or showing UI happens only inside the platform
 *     adapter (src/platform) — that's the one place allowed to touch the
 *     real machine, behind an interface the rest of core never needs to know
 *     is macOS-specific, and that tests can swap for a mock.
 */

export const CORE_VERSION = '0.0.0';

export type {
  LauncherConfigFields,
  LauncherMode,
  RawLauncherConfig,
  ResolveConfigOptions,
  ResolvedLauncherConfig,
} from './config/index.js';
export {
  buildDefaultsFromDetection,
  CONFIG_SCHEMA,
  DEFAULT_MODE,
  DEFAULT_OPEN_PATH,
  DEFAULT_READY_TIMEOUT_SECONDS,
  generateConfigSchemaJson,
  resolveConfig,
  validateLauncherConfigFields,
  validateRawLauncherConfig,
} from './config/index.js';

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
export type {
  BundleFile,
  CommandResult,
  CommandRunner,
  CreatePlatformAdapterOptions,
  DialogOptions,
  DialogResult,
  MacosPlatformAdapterOptions,
  NotificationOptions,
  PlatformAdapter,
  WriteBundleOptions,
} from './platform/index.js';
export {
  createMacosPlatformAdapter,
  createPlatformAdapter,
  createSystemCommandRunner,
  createUnsupportedPlatformAdapter,
} from './platform/index.js';
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
export type { ReportEnvironment, ReportInput } from './report/index.js';
export { buildReport, MAX_REPORT_CHARACTERS, REPORT_LOG_LINE_LIMIT } from './report/index.js';
