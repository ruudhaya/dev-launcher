import type { DevlaunchErrorCode } from '@devlaunch/core';
import { ERROR_CATALOG } from '@devlaunch/core';

/** See docs/agent-contract.md. */
export const EXIT_CODES = {
  OK: 0,
  UNEXPECTED: 1,
  USAGE: 2,
  NEEDS_USER: 3,
  ENVIRONMENT: 4,
  UNSUPPORTED: 5,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

/** Maps a catalog code to its exit code — PLATFORM_UNSUPPORTED is the one special case. */
export function exitCodeForErrorCode(code: DevlaunchErrorCode): ExitCode {
  if (code === 'PLATFORM_UNSUPPORTED') {
    return EXIT_CODES.UNSUPPORTED;
  }
  switch (ERROR_CATALOG[code].category) {
    case 'user-action':
      return EXIT_CODES.NEEDS_USER;
    case 'environment':
    case 'project-code':
      return EXIT_CODES.ENVIRONMENT;
    case 'devlaunch-bug':
      return EXIT_CODES.UNEXPECTED;
    default:
      return EXIT_CODES.UNEXPECTED;
  }
}

/** Maps an arbitrary caught error to an exit code, using the catalog when it's ours. */
export function exitCodeForError(error: unknown): ExitCode {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' && code in ERROR_CATALOG) {
      return exitCodeForErrorCode(code as DevlaunchErrorCode);
    }
  }
  return EXIT_CODES.UNEXPECTED;
}
