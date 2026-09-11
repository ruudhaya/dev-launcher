/**
 * Common secret formats to redact from logs and reports even when we don't
 * know they came from a project's .env file (e.g. a secret pasted into a
 * console.log, or one belonging to a service the project never declared).
 *
 * Each pattern replaces its match with a fixed placeholder; `password=` keeps
 * the keyword and redacts only the value, via a capture group.
 */
export interface SecretPattern {
  readonly name: string;
  readonly pattern: RegExp;
  /** Replacement string, using `$1` etc. to keep captured groups (e.g. the keyword). */
  readonly replacement: string;
}

export const SECRET_PATTERNS: readonly SecretPattern[] = [
  { name: 'openai-key', pattern: /sk-[A-Za-z0-9]{16,}/g, replacement: '[REDACTED]' },
  { name: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g, replacement: '[REDACTED]' },
  { name: 'aws-access-key-id', pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED]' },
  { name: 'slack-token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/g, replacement: '[REDACTED]' },
  {
    name: 'jwt',
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED]',
  },
  {
    name: 'bearer-token',
    pattern: /\b(Bearer)\s+[A-Za-z0-9._-]+/gi,
    replacement: '$1 [REDACTED]',
  },
  {
    name: 'password-assignment',
    pattern: /\b(password)\s*=\s*("[^"]*"|'[^']*'|\S+)/gi,
    replacement: '$1=[REDACTED]',
  },
];
