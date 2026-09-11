import { describe, expect, it } from 'vitest';
import {
  buildDefaultsFromDetection,
  CONFIG_SCHEMA,
  DEFAULT_MODE,
  DEFAULT_OPEN_PATH,
  DEFAULT_READY_TIMEOUT_SECONDS,
  generateConfigSchemaJson,
  resolveConfig,
} from '../src/config/index.js';
import type { ProjectDetection } from '../src/detect/index.js';
import { DevlaunchError } from '../src/errors/index.js';

function fakeDetection(overrides: Partial<ProjectDetection> = {}): ProjectDetection {
  return {
    projectDir: '/tmp/my-project',
    projectName: 'my-project',
    packageManager: 'npm',
    devScriptCandidates: [{ name: 'dev', command: 'vite' }],
    devScript: { name: 'dev', command: 'vite' },
    framework: { name: 'vite', defaultPort: 5173, readyPattern: /Local/ },
    port: 5173,
    nodeVersion: undefined,
    workspaceApps: [],
    iconCandidates: [],
    importedRunConfig: undefined,
    source: 'heuristic',
    ...overrides,
  };
}

describe('buildDefaultsFromDetection', () => {
  it('sanitizes a scoped package name', () => {
    const defaults = buildDefaultsFromDetection(fakeDetection(), '@acme/web-app');
    expect(defaults.name).toBe('acme-web-app');
  });

  it('falls back to the directory basename with no package.json name', () => {
    const defaults = buildDefaultsFromDetection(
      fakeDetection({ projectDir: '/tmp/some-dir', projectName: undefined }),
    );
    expect(defaults.name).toBe('some-dir');
  });

  it('carries the dev script name, port, and first icon candidate through', () => {
    const defaults = buildDefaultsFromDetection(
      fakeDetection({ iconCandidates: [{ path: 'public/logo.png', source: 'public/logo.png' }] }),
    );
    expect(defaults.script).toBe('dev');
    expect(defaults.port).toBe(5173);
    expect(defaults.icon).toBe('public/logo.png');
    expect(defaults.mode).toBe(DEFAULT_MODE);
    expect(defaults.openPath).toBe(DEFAULT_OPEN_PATH);
    expect(defaults.readyTimeoutSeconds).toBe(DEFAULT_READY_TIMEOUT_SECONDS);
  });
});

describe('resolveConfig — precedence', () => {
  const defaults = { name: 'from-defaults', port: 5173, mode: 'terminal' as const };

  it('uses defaults when nothing else is set', () => {
    const resolved = resolveConfig({ defaults });
    expect(resolved).toEqual({
      name: 'from-defaults',
      script: undefined,
      port: 5173,
      mode: 'terminal',
      icon: undefined,
      openPath: '/',
      browser: undefined,
      readyTimeoutSeconds: 90,
    });
  });

  it('package.json "launcher" overrides defaults', () => {
    const resolved = resolveConfig({
      defaults,
      packageJsonLauncher: { name: 'from-package-json' },
    });
    expect(resolved).toMatchObject({ name: 'from-package-json', port: 5173 });
  });

  it('.devlaunch.local.json overrides package.json', () => {
    const resolved = resolveConfig({
      defaults,
      packageJsonLauncher: { name: 'from-package-json', port: 4000 },
      localConfig: { port: 4001 },
    });
    expect(resolved).toMatchObject({ name: 'from-package-json', port: 4001 });
  });

  it('flags win over everything', () => {
    const resolved = resolveConfig({
      defaults,
      packageJsonLauncher: { name: 'from-package-json' },
      localConfig: { name: 'from-local-config' },
      flags: { name: 'from-flags' },
    });
    expect(resolved).toMatchObject({ name: 'from-flags' });
  });
});

describe('resolveConfig — monorepo array', () => {
  it('returns one resolved config per package.json "launcher" entry', () => {
    const resolved = resolveConfig({
      defaults: { name: 'fallback', mode: 'terminal' },
      packageJsonLauncher: [
        { name: 'web', script: 'dev', port: 4001 },
        { name: 'admin', script: 'dev', port: 4002 },
      ],
    });
    expect(Array.isArray(resolved)).toBe(true);
    expect((resolved as ReturnType<typeof resolveConfig>[]).length).toBe(2);
    expect(resolved).toEqual([
      expect.objectContaining({ name: 'web', port: 4001 }),
      expect.objectContaining({ name: 'admin', port: 4002 }),
    ]);
  });

  it('applies .devlaunch.local.json and flags uniformly across every app', () => {
    const resolved = resolveConfig({
      defaults: { name: 'fallback' },
      packageJsonLauncher: [{ name: 'web' }, { name: 'admin' }],
      localConfig: { mode: 'headless' },
    }) as ReadonlyArray<{ mode: string }>;
    expect(resolved.every((entry) => entry.mode === 'headless')).toBe(true);
  });

  it('rejects an empty array', () => {
    expect(() => resolveConfig({ defaults: { name: 'x' }, packageJsonLauncher: [] })).toThrow(
      DevlaunchError,
    );
  });
});

describe('resolveConfig — validation', () => {
  it('throws CONFIG_INVALID for an out-of-range port', () => {
    try {
      resolveConfig({ defaults: { name: 'x' }, flags: { port: 99999 } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DevlaunchError);
      expect((err as DevlaunchError).code).toBe('CONFIG_INVALID');
      expect((err as DevlaunchError).message).toContain('port');
    }
  });

  it('throws CONFIG_INVALID for an invalid mode', () => {
    expect(() => resolveConfig({ defaults: { name: 'x' }, localConfig: { mode: 'gui' } })).toThrow(
      DevlaunchError,
    );
  });

  it('throws CONFIG_INVALID for an unknown field (catches typos)', () => {
    expect(() =>
      resolveConfig({ defaults: { name: 'x' }, packageJsonLauncher: { protr: 3000 } }),
    ).toThrow(DevlaunchError);
  });

  it('throws CONFIG_INVALID when neither layer nor default supplies a name', () => {
    expect(() => resolveConfig({ defaults: {} })).toThrow(DevlaunchError);
  });

  it('rejects .devlaunch.local.json or flags being an array', () => {
    expect(() => resolveConfig({ defaults: { name: 'x' }, localConfig: [{ name: 'x' }] })).toThrow(
      DevlaunchError,
    );
    expect(() => resolveConfig({ defaults: { name: 'x' }, flags: [{ name: 'x' }] })).toThrow(
      DevlaunchError,
    );
  });

  it.each(['processes', 'env'])('rejects the reserved "%s" field with a clear message', (field) => {
    try {
      resolveConfig({ defaults: { name: 'x' }, packageJsonLauncher: { [field]: {} } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DevlaunchError);
      expect((err as DevlaunchError).code).toBe('CONFIG_INVALID');
      expect((err as DevlaunchError).message).toContain(`"${field}"`);
      expect((err as DevlaunchError).message.toLowerCase()).toContain('not supported yet');
    }
  });
});

describe('CONFIG_SCHEMA / generateConfigSchemaJson', () => {
  it('is valid JSON Schema shape with additionalProperties false', () => {
    expect(CONFIG_SCHEMA.$schema).toContain('json-schema.org');
    const [single] = CONFIG_SCHEMA.oneOf;
    expect(single.additionalProperties).toBe(false);
    expect(Object.keys(single.properties)).toEqual(
      expect.arrayContaining([
        'name',
        'script',
        'port',
        'mode',
        'icon',
        'openPath',
        'browser',
        'readyTimeoutSeconds',
      ]),
    );
    // processes/env are reserved, not part of the schema — additionalProperties:false rejects them.
    expect(single.properties).not.toHaveProperty('processes');
    expect(single.properties).not.toHaveProperty('env');
  });

  it('serializes to parseable JSON ending in a newline', () => {
    const json = generateConfigSchemaJson();
    expect(json.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
