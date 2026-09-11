/**
 * @devlaunch/core — pure engine. No product logic lives here yet.
 *
 * Boundary rules (see CLAUDE.md):
 *   - Never touches process.stdout / process.stderr.
 *   - Never prompts, never reads argv, never calls process.exit.
 *   - Returns plain data and typed errors; the CLI owns all I/O and presentation.
 */

export const CORE_VERSION = '0.0.0';

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
