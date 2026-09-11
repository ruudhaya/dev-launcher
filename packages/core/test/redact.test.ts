import { describe, expect, it } from 'vitest';
import {
  collectSecretValues,
  createRedactor,
  parseEnvFile,
  redactKnownValues,
  redactPatterns,
  redactText,
} from '../src/redact/index.js';

describe('parseEnvFile', () => {
  it('parses KEY=value pairs, ignoring comments and blank lines', () => {
    const parsed = parseEnvFile(
      ['# a comment', '', 'API_KEY=abc123def456', 'export DATABASE_URL=postgres://x'].join('\n'),
    );
    expect(parsed).toEqual({
      API_KEY: 'abc123def456',
      DATABASE_URL: 'postgres://x',
    });
  });

  it('strips a single matching pair of quotes', () => {
    const parsed = parseEnvFile(['DOUBLE="quoted value"', "SINGLE='also quoted'"].join('\n'));
    expect(parsed).toEqual({ DOUBLE: 'quoted value', SINGLE: 'also quoted' });
  });

  it('skips malformed lines without throwing', () => {
    expect(() => parseEnvFile('not a valid line\n123KEY=oops\n=novalue')).not.toThrow();
    expect(parseEnvFile('not a valid line\n123KEY=oops\n=novalue')).toEqual({});
  });
});

describe('collectSecretValues', () => {
  it('collects values from non-public, sufficiently long keys', () => {
    const values = collectSecretValues(['API_KEY=sk-realsecretvalue1234567890']);
    expect(values.has('sk-realsecretvalue1234567890')).toBe(true);
  });

  it('excludes values behind known public prefixes', () => {
    const values = collectSecretValues(['NEXT_PUBLIC_ANALYTICS_ID=UA-longenoughvalue']);
    expect(values.size).toBe(0);
  });

  it('excludes short values like ports and booleans (false-positive guard)', () => {
    const values = collectSecretValues(['PORT=3000', 'DEBUG=true', 'NODE_ENV=dev']);
    expect(values.size).toBe(0);
  });
});

describe('redactKnownValues', () => {
  it('replaces every occurrence of a known secret value', () => {
    const out = redactKnownValues('key is topsecret123 and again topsecret123', ['topsecret123']);
    expect(out).toBe('key is [REDACTED] and again [REDACTED]');
  });

  it('redacts the longer of two overlapping values fully, not partially', () => {
    const out = redactKnownValues('value: abc123def456', ['abc123def456', 'abc123']);
    expect(out).toBe('value: [REDACTED]');
  });

  it('is a no-op with no secret values', () => {
    expect(redactKnownValues('nothing to see here', [])).toBe('nothing to see here');
  });
});

describe('redactPatterns', () => {
  it('redacts an OpenAI-style key', () => {
    expect(redactPatterns('OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwx')).toBe(
      'OPENAI_API_KEY=[REDACTED]',
    );
  });

  it('redacts a GitHub token', () => {
    expect(redactPatterns('token: ghp_abcdefghijklmnopqrstuvwxyz012345')).toBe('token: [REDACTED]');
  });

  it('redacts an AWS access key id', () => {
    expect(redactPatterns('AKIAIOSFODNN7EXAMPLE found in logs')).toBe('[REDACTED] found in logs');
  });

  it('redacts a Slack token', () => {
    expect(redactPatterns('xoxb-1234567890-abcdefghijklmnop')).toBe('[REDACTED]');
  });

  it('redacts a JWT', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzbm90YXJlYWxzaWc';
    expect(redactPatterns(`Authorization: ${jwt}`)).toBe('Authorization: [REDACTED]');
  });

  it('redacts a Bearer token but keeps the "Bearer" keyword', () => {
    expect(redactPatterns('Authorization: Bearer abc123.def456-ghi')).toBe(
      'Authorization: Bearer [REDACTED]',
    );
  });

  it('redacts a password= assignment but keeps the keyword', () => {
    expect(redactPatterns('password=hunter2')).toBe('password=[REDACTED]');
    expect(redactPatterns('PASSWORD="hunter2 with spaces"')).toBe('PASSWORD=[REDACTED]');
  });

  it('does not redact the word "password" without an assignment (false-positive guard)', () => {
    expect(redactPatterns('please enter your password to continue')).toBe(
      'please enter your password to continue',
    );
  });

  it('does not redact short strings that merely contain a secret prefix (false-positive guard)', () => {
    expect(redactPatterns('the desk-top computer needs a sk-in cream')).toBe(
      'the desk-top computer needs a sk-in cream',
    );
    expect(redactPatterns('AKIAEXAMPLE is too short to be a real key')).toBe(
      'AKIAEXAMPLE is too short to be a real key',
    );
  });

  it('does not redact an ordinary word that merely starts like a GitHub token prefix', () => {
    expect(redactPatterns('the ghost_writer library is great')).toBe(
      'the ghost_writer library is great',
    );
  });
});

describe('redactText', () => {
  it('applies both known-value and pattern redaction', () => {
    const out = redactText('DB_PASS=mySecretDbPass123 and password=hunter2', ['mySecretDbPass123']);
    expect(out).toBe('DB_PASS=[REDACTED] and password=[REDACTED]');
  });
});

describe('createRedactor', () => {
  it("redacts a project's .env values out of arbitrary log text", () => {
    const redactor = createRedactor(['OPENAI_API_KEY=sk-thisisarealsecretvalue123']);
    expect(redactor.secretValueCount).toBe(1);
    expect(redactor.redact('starting server with key sk-thisisarealsecretvalue123 loaded')).toBe(
      'starting server with key [REDACTED] loaded',
    );
  });

  it('leaves ordinary log lines untouched', () => {
    const redactor = createRedactor(['API_KEY=sk-thisisarealsecretvalue123']);
    expect(redactor.redact('Local: http://localhost:5173/')).toBe('Local: http://localhost:5173/');
  });
});
