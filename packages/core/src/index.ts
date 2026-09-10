/**
 * @devlaunch/core — pure engine. No product logic lives here yet.
 *
 * Boundary rules (see CLAUDE.md):
 *   - Never touches process.stdout / process.stderr.
 *   - Never prompts, never reads argv, never calls process.exit.
 *   - Returns plain data and typed errors; the CLI owns all I/O and presentation.
 */

export const CORE_VERSION = '0.0.0';

/** Package managers devlaunch knows how to drive. */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * Everything detection needs to resolve before a launcher can be generated.
 * Fields are filled in by later sessions; the shape is intentionally minimal now.
 */
export interface ProjectProfile {
  readonly projectDir: string;
  readonly packageManager: PackageManager;
  readonly devScript: string;
  readonly framework: string | undefined;
  readonly port: number | undefined;
  readonly nodeVersion: string | undefined;
}

/** Stable error codes the CLI maps to native macOS dialogs with an action. */
export type DevlaunchErrorCode =
  | 'NOT_IMPLEMENTED'
  | 'NO_PACKAGE_JSON'
  | 'NO_DEV_SCRIPT'
  | 'UNSUPPORTED_PLATFORM';

/** The only error type core throws. Carries a code + a user-facing message. */
export class DevlaunchError extends Error {
  readonly code: DevlaunchErrorCode;

  constructor(code: DevlaunchErrorCode, message: string) {
    super(message);
    this.name = 'DevlaunchError';
    this.code = code;
  }
}

/**
 * Placeholder for the detection entry point. Product logic arrives in a later
 * session; for now this documents the contract and fails loudly if called.
 */
export function detectProject(_projectDir: string): ProjectProfile {
  throw new DevlaunchError(
    'NOT_IMPLEMENTED',
    'Project detection is not implemented yet. This scaffold session only sets up structure.',
  );
}
