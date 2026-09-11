import { describe, expect, it } from 'vitest';
import {
  DevlaunchError,
  ERROR_CATALOG,
  generateMarkdownReference,
  generateShellStrings,
  getErrorEntry,
  listErrorEntries,
} from '../src/errors/index.js';
import type { DevlaunchErrorCode, ErrorCatalogEntry } from '../src/errors/types.js';

const REQUIRED_CODES: readonly DevlaunchErrorCode[] = [
  'NODE_NOT_FOUND',
  'NODE_VERSION_MISSING',
  'PROJECT_MOVED',
  'PORT_IN_USE',
  'DEPS_INSTALL_FAILED',
  'SERVER_EXITED_EARLY',
  'READY_TIMEOUT',
  'CONFIG_INVALID',
  'NAME_COLLISION',
  'PLATFORM_UNSUPPORTED',
  'SPOTLIGHT_NOT_INDEXING',
];

const CATEGORIES = new Set(['user-action', 'environment', 'project-code', 'devlaunch-bug']);

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

describe('ERROR_CATALOG', () => {
  const entries = Object.entries(ERROR_CATALOG) as [DevlaunchErrorCode, ErrorCatalogEntry][];

  it('includes every code required by the L1-1 spec', () => {
    for (const code of REQUIRED_CODES) {
      expect(ERROR_CATALOG[code]).toBeDefined();
    }
  });

  it('has unique codes matching their key', () => {
    const codes = entries.map(([, entry]) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const [key, entry] of entries) {
      expect(entry.code).toBe(key);
    }
  });

  it('has complete, non-empty fields for every entry', () => {
    for (const [, entry] of entries) {
      expect(CATEGORIES.has(entry.category)).toBe(true);
      expect(nonEmptyString(entry.title)).toBe(true);
      expect(nonEmptyString(entry.explanation)).toBe(true);
      expect(nonEmptyString(entry.agentHint)).toBe(true);
      expect(nonEmptyString(entry.developerDetail)).toBe(true);
      expect(entry.actions.length).toBeGreaterThan(0);
      for (const action of entry.actions) {
        expect(nonEmptyString(action)).toBe(true);
      }
    }
  });

  it('keeps explanations jargon-light (no raw PID/localhost/CLI in prose)', () => {
    const jargon = /\b(PID|localhost|CLI)\b/;
    for (const [, entry] of entries) {
      expect(entry.explanation).not.toMatch(jargon);
    }
  });

  it('getErrorEntry returns the same entry as direct lookup', () => {
    expect(getErrorEntry('PORT_IN_USE')).toBe(ERROR_CATALOG.PORT_IN_USE);
  });

  it('getErrorEntry throws for an unregistered code', () => {
    expect(() => getErrorEntry('NOPE' as DevlaunchErrorCode)).toThrow();
  });

  it('listErrorEntries returns every entry sorted by code', () => {
    const listed = listErrorEntries();
    expect(listed.length).toBe(entries.length);
    const codes = listed.map((entry) => entry.code);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });
});

describe('DevlaunchError', () => {
  it('carries a code and message', () => {
    const err = new DevlaunchError('PORT_IN_USE', 'port 5173 is taken by pid 1234');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('DevlaunchError');
    expect(err.code).toBe('PORT_IN_USE');
    expect(err.message).toBe('port 5173 is taken by pid 1234');
  });

  it('supports a wrapped cause', () => {
    const cause = new Error('ENOENT');
    const err = new DevlaunchError('PROJECT_MOVED', 'project dir is gone', { cause });
    expect(err.cause).toBe(cause);
  });
});

describe('generateShellStrings', () => {
  const shell = generateShellStrings();

  it('starts with a generated-file notice', () => {
    expect(shell.startsWith('# GENERATED FILE')).toBe(true);
  });

  it('defines a variable per field for every code', () => {
    for (const entry of listErrorEntries()) {
      expect(shell).toContain(`DEVLAUNCH_ERROR_${entry.code}_TITLE=`);
      expect(shell).toContain(`DEVLAUNCH_ERROR_${entry.code}_EXPLANATION=`);
      expect(shell).toContain(`DEVLAUNCH_ERROR_${entry.code}_ACTIONS=`);
      expect(shell).toContain(`DEVLAUNCH_ERROR_${entry.code}_AGENT_HINT=`);
    }
  });

  it('escapes double quotes and dollar signs so the shell can source it safely', () => {
    const entries = [
      {
        code: 'DEVLAUNCH_BUG' as DevlaunchErrorCode,
        category: 'devlaunch-bug' as const,
        title: 'has "quotes" and a $variable and a `backtick`',
        explanation: 'x',
        actions: ['OK'],
        agentHint: 'x',
        developerDetail: 'x',
      },
    ];
    const out = generateShellStrings(entries);
    expect(out).toContain('\\"quotes\\"');
    expect(out).toContain('\\$variable');
    expect(out).toContain('\\`backtick\\`');
  });
});

describe('generateMarkdownReference', () => {
  const markdown = generateMarkdownReference();

  it('starts with a generated-file notice', () => {
    expect(markdown).toContain('GENERATED FILE');
  });

  it('has a heading and dialog actions for every code', () => {
    for (const entry of listErrorEntries()) {
      expect(markdown).toContain(`## ${entry.code}`);
      for (const action of entry.actions) {
        expect(markdown).toContain(`- ${action}`);
      }
    }
  });
});
