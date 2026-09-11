import { collectSecretValues } from './env.js';
import { SECRET_PATTERNS } from './patterns.js';

/** Escape a string for use as a literal inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Redact known secret values (exact matches, e.g. from a project's .env
 * files) out of arbitrary text. Longer values are replaced first so a secret
 * that happens to contain a shorter one doesn't leave a partial match behind.
 */
export function redactKnownValues(text: string, secretValues: Iterable<string>): string {
  const values = [...secretValues].filter((v) => v.length > 0).sort((a, b) => b.length - a.length);
  if (values.length === 0) {
    return text;
  }
  const pattern = new RegExp(values.map(escapeRegExp).join('|'), 'g');
  return text.replace(pattern, '[REDACTED]');
}

/** Redact text against the common secret-shaped patterns (sk-, ghp_, AKIA, JWTs, …). */
export function redactPatterns(text: string): string {
  return SECRET_PATTERNS.reduce(
    (result, { pattern, replacement }) => result.replace(pattern, replacement),
    text,
  );
}

/** Redact both known values and pattern-matched secrets in one pass. */
export function redactText(text: string, secretValues: Iterable<string> = []): string {
  return redactPatterns(redactKnownValues(text, secretValues));
}

/**
 * Build a redactor bound to a project's .env file contents (read in memory by
 * the caller — devlaunch never persists them). Use one instance per project so
 * the secret-value scan only happens once.
 */
export function createRedactor(envFileContents: readonly string[] = []): {
  readonly secretValueCount: number;
  redact(text: string): string;
} {
  const secretValues = collectSecretValues(envFileContents);
  return {
    secretValueCount: secretValues.size,
    redact: (text: string) => redactText(text, secretValues),
  };
}
