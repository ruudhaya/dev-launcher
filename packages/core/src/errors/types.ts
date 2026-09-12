/**
 * Stable error codes devlaunch can raise. Codes are part of the public contract:
 * the CLI's `--json` output, generated dialogs, and the agent skill all key off
 * them, so once shipped a code is never renamed or reused for a different
 * meaning — retire it and add a new one instead.
 */
export type DevlaunchErrorCode =
  | 'NODE_NOT_FOUND'
  | 'NODE_VERSION_MISSING'
  | 'PROJECT_MOVED'
  | 'PORT_IN_USE'
  | 'DEPS_INSTALL_FAILED'
  | 'SERVER_EXITED_EARLY'
  | 'READY_TIMEOUT'
  | 'CONFIG_INVALID'
  | 'NAME_COLLISION'
  | 'PLATFORM_UNSUPPORTED'
  | 'SPOTLIGHT_NOT_INDEXING'
  | 'NO_PACKAGE_JSON'
  | 'NO_DEV_SCRIPT'
  | 'RUN_CONFIG_INVALID'
  | 'LAUNCHER_NOT_FOUND'
  | 'DEVLAUNCH_BUG';

/**
 * Who's at fault, roughly — drives tone (an environment problem isn't the
 * user's mistake) and which dialog actions make sense.
 */
export type ErrorCategory = 'user-action' | 'environment' | 'project-code' | 'devlaunch-bug';

/**
 * Everything needed to explain one failure to a human, a native dialog, and a
 * coding agent, from a single source of truth.
 */
export interface ErrorCatalogEntry {
  /** Stable identifier, matches the key it's stored under. */
  readonly code: DevlaunchErrorCode;
  readonly category: ErrorCategory;
  /** Short, user-facing summary. Shown as a dialog title and a report headline. */
  readonly title: string;
  /** One or two sentences, jargon-light, explaining what happened and why. */
  readonly explanation: string;
  /** Dialog button labels, in the order they should appear. */
  readonly actions: readonly string[];
  /** Imperative instructions for a coding agent handling this on the user's behalf. */
  readonly agentHint: string;
  /** Technical detail for developers: what devlaunch checked, what it found. */
  readonly developerDetail: string;
}
