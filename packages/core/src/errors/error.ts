import type { DevlaunchErrorCode } from './types.js';

/**
 * The only error type core throws. `code` selects the ERROR_CATALOG entry with
 * the user-facing title/explanation/actions; `message` carries the specific
 * detail for this occurrence (which port, which file, which version).
 */
export class DevlaunchError extends Error {
  readonly code: DevlaunchErrorCode;

  constructor(code: DevlaunchErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DevlaunchError';
    this.code = code;
  }
}
