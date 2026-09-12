import type { Envelope } from './envelope.js';
import type { ExitCode } from './exit-codes.js';

export interface CommandResult {
  readonly envelope: Envelope;
  readonly exitCode: ExitCode;
  /** Plain (non --json) output. Falls back to envelope.message (+ hint on failure) if omitted. */
  readonly plainLines?: readonly string[];
}
