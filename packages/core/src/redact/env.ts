/**
 * Minimal .env parsing, in memory only. devlaunch never writes .env contents
 * anywhere — the caller (cli) reads the file, hands the raw text in here, and
 * only the resulting Set of secret values is kept around long enough to redact
 * logs and reports.
 */

/** Prefixes that mark a variable as meant to be public (baked into client bundles). */
const PUBLIC_KEY_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'REACT_APP_',
  'GATSBY_',
  'EXPO_PUBLIC_',
  'NUXT_PUBLIC_',
];

/**
 * Below this length a value is more likely a port, a flag, or a short word
 * than a real secret — redacting it costs debuggability for no safety benefit.
 */
export const MIN_SECRET_VALUE_LENGTH = 6;

/** Parse .env-style text into key/value pairs. Unknown lines are skipped. */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const withoutExport = line.startsWith('export ') ? line.slice('export '.length) : line;
    const eq = withoutExport.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    let value = withoutExport.slice(eq + 1).trim();
    // Strip a single matching pair of quotes; don't try to unescape further —
    // this only needs to be good enough to find secret-shaped values.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function isPublicKey(key: string): boolean {
  const upper = key.toUpperCase();
  return PUBLIC_KEY_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

/**
 * Parse a set of .env file contents and collect the values worth redacting:
 * non-public keys with a value long enough to plausibly be a secret.
 */
export function collectSecretValues(envFileContents: readonly string[]): Set<string> {
  const values = new Set<string>();

  for (const content of envFileContents) {
    const parsed = parseEnvFile(content);
    for (const [key, value] of Object.entries(parsed)) {
      if (value.length < MIN_SECRET_VALUE_LENGTH) {
        continue;
      }
      if (isPublicKey(key)) {
        continue;
      }
      values.add(value);
    }
  }

  return values;
}
