import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectSecretValues } from '@devlaunch/core';

/** The .env-shaped files a project might keep secrets in, checked in this order. */
const ENV_FILE_NAMES = ['.env', '.env.local', '.env.development', '.env.development.local'];

/**
 * Best-effort collection of a project's own secret values, so logs/reports
 * redact them by exact match on top of the pattern-based redaction that
 * always runs — devlaunch never stores or transmits these, it only reads
 * them in memory long enough to redact (see CLAUDE.md's redaction principle).
 */
export function collectProjectSecretValues(projectDir: string): Set<string> {
  const contents: string[] = [];
  for (const fileName of ENV_FILE_NAMES) {
    try {
      contents.push(readFileSync(join(projectDir, fileName), 'utf8'));
    } catch {
      // Missing/unreadable — fine, most projects won't have all of these.
    }
  }
  return collectSecretValues(contents);
}
