import { DevlaunchError, getErrorEntry } from '@devlaunch/core';

/** See docs/agent-contract.md and schemas/envelope.schema.json. */
export interface Envelope {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly code: string;
  readonly message: string;
  readonly hint: string | null;
  readonly data: unknown;
}

export function okEnvelope(
  message: string,
  data: unknown = null,
  hint: string | null = null,
): Envelope {
  return { schemaVersion: 1, ok: true, code: 'OK', message, hint, data };
}

export function errEnvelope(
  code: string,
  message: string,
  hint: string | null = null,
  data: unknown = null,
): Envelope {
  return { schemaVersion: 1, ok: false, code, message, hint, data };
}

/** Builds an error envelope from a caught error, using the catalog when it's ours. */
export function envelopeFromError(error: unknown, data: unknown = null): Envelope {
  if (error instanceof DevlaunchError) {
    const entry = getErrorEntry(error.code);
    return errEnvelope(error.code, error.message || entry.title, entry.agentHint, data);
  }
  const message = error instanceof Error ? error.message : String(error);
  return errEnvelope(
    'DEVLAUNCH_BUG',
    message,
    'Run `devlaunch report --clipboard` and file an issue.',
    data,
  );
}
