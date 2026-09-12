import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BundleRegistry } from '../src/bundle/index.js';
import {
  generateLauncherEnv,
  parseRegistry,
  planBundle,
  readRegistry,
  removeRegistryEntry,
  serializeRegistry,
  setLsUiElementHeadless,
  slugify,
  substitutePlaceholders,
  upsertRegistryEntry,
  writeBundle,
} from '../src/bundle/index.js';
import type { ResolvedLauncherConfig } from '../src/config/index.js';
import { DevlaunchError } from '../src/errors/index.js';
import type { BundleFile, PlatformAdapter, WriteBundleOptions } from '../src/platform/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const runtimeTemplatesDir = resolve(here, '../../runtime/templates');

function fakeConfig(overrides: Partial<ResolvedLauncherConfig> = {}): ResolvedLauncherConfig {
  return {
    name: 'My App',
    script: 'dev',
    port: 5173,
    mode: 'terminal',
    icon: undefined,
    openPath: '/',
    browser: undefined,
    readyTimeoutSeconds: 90,
    ...overrides,
  };
}

describe('slugify', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugify('My Cool App!')).toBe('my-cool-app');
    expect(slugify('@acme/web-app')).toBe('acme-web-app');
  });

  it('trims leading/trailing dashes', () => {
    expect(slugify('--Foo--')).toBe('foo');
  });

  it('falls back to "app" when nothing alphanumeric survives', () => {
    expect(slugify('!!!')).toBe('app');
  });
});

describe('substitutePlaceholders', () => {
  it('replaces every occurrence of a token', () => {
    expect(substitutePlaceholders('__A__ and __A__ again', { A: 'x' })).toBe('x and x again');
  });

  it('leaves unmatched placeholders untouched', () => {
    expect(substitutePlaceholders('__A__ __B__', { A: 'x' })).toBe('x __B__');
  });

  it('ignores tokens with no placeholder in the template', () => {
    expect(substitutePlaceholders('plain text', { UNUSED: 'x' })).toBe('plain text');
  });
});

describe('setLsUiElementHeadless', () => {
  const snippet = '<key>LSUIElement</key>\n<true/>';

  it('keeps <true/> for headless', () => {
    expect(setLsUiElementHeadless(snippet, true)).toBe(snippet);
  });

  it('flips to <false/> for terminal mode', () => {
    expect(setLsUiElementHeadless(snippet, false)).toBe('<key>LSUIElement</key>\n<false/>');
  });

  it('the runtime template on its own is valid, real plist XML (a real <true/>, not a token)', () => {
    const realTemplate = readFileSync(resolve(runtimeTemplatesDir, 'Info.plist'), 'utf8');
    expect(realTemplate).toContain('<key>LSUIElement</key>');
    expect(realTemplate).not.toMatch(/<__[A-Z_]+__\/>/);
  });
});

describe('registry', () => {
  it('parses valid JSON, and treats missing/corrupt content as empty', () => {
    expect(parseRegistry(undefined)).toEqual({});
    expect(parseRegistry('not json')).toEqual({});
    expect(parseRegistry('{"my-app":{"projectDir":"/x"}}')).toEqual({
      'my-app': { projectDir: '/x' },
    });
  });

  it('serializes to parseable JSON ending in a newline', () => {
    const json = serializeRegistry({});
    expect(json.endsWith('\n')).toBe(true);
    expect(JSON.parse(json)).toEqual({});
  });

  it('upsertRegistryEntry sets createdAt once and bumps updatedAt', () => {
    const first = upsertRegistryEntry(
      {},
      'my-app',
      { projectDir: '/x', bundlePath: '/x.app', devlaunchVersion: '0.0.0' },
      '2026-01-01T00:00:00.000Z',
    );
    expect(first['my-app']).toMatchObject({
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const second = upsertRegistryEntry(
      first,
      'my-app',
      { projectDir: '/x', bundlePath: '/x.app', devlaunchVersion: '0.1.0' },
      '2026-02-01T00:00:00.000Z',
    );
    expect(second['my-app']).toMatchObject({
      createdAt: '2026-01-01T00:00:00.000Z', // unchanged
      updatedAt: '2026-02-01T00:00:00.000Z',
      devlaunchVersion: '0.1.0',
    });
  });

  it('removeRegistryEntry removes only the named entry', () => {
    const registry: BundleRegistry = {
      a: {
        projectDir: '/a',
        bundlePath: '/a.app',
        devlaunchVersion: '0',
        createdAt: '',
        updatedAt: '',
      },
      b: {
        projectDir: '/b',
        bundlePath: '/b.app',
        devlaunchVersion: '0',
        createdAt: '',
        updatedAt: '',
      },
    };
    expect(Object.keys(removeRegistryEntry(registry, 'a'))).toEqual(['b']);
  });
});

describe('generateLauncherEnv', () => {
  it('includes every defined field, quoted', () => {
    const env = generateLauncherEnv({
      projectDir: '/Users/me/my-app',
      name: 'My App',
      slug: 'my-app',
      script: 'dev',
      port: 5173,
      mode: 'terminal',
      openPath: '/',
      browser: 'com.google.Chrome',
      readyTimeoutSeconds: 90,
      packageManager: 'npm',
      nodeVersion: { version: '20', source: 'nvmrc' },
      devlaunchVersion: '0.0.0',
    });
    expect(env).toContain('DEVLAUNCH_PROJECT_DIR="/Users/me/my-app"');
    expect(env).toContain('DEVLAUNCH_NAME="My App"');
    expect(env).toContain('DEVLAUNCH_SLUG="my-app"');
    expect(env).toContain('DEVLAUNCH_PORT="5173"');
    expect(env).toContain('DEVLAUNCH_BROWSER="com.google.Chrome"');
    expect(env).toContain('DEVLAUNCH_NODE_VERSION="20"');
    expect(env).toContain('DEVLAUNCH_NODE_VERSION_SOURCE="nvmrc"');
    expect(env.endsWith('\n')).toBe(true);
  });

  it('omits undefined optional fields instead of writing an empty value', () => {
    const env = generateLauncherEnv({
      projectDir: '/x',
      name: 'x',
      slug: 'x',
      script: undefined,
      port: undefined,
      mode: 'headless',
      openPath: '/',
      browser: undefined,
      readyTimeoutSeconds: 90,
      packageManager: 'npm',
      nodeVersion: undefined,
      devlaunchVersion: '0.0.0',
    });
    expect(env).not.toContain('DEVLAUNCH_SCRIPT');
    expect(env).not.toContain('DEVLAUNCH_PORT');
    expect(env).not.toContain('DEVLAUNCH_BROWSER');
    expect(env).not.toContain('DEVLAUNCH_NODE_VERSION');
  });

  it('escapes double quotes in values', () => {
    const env = generateLauncherEnv({
      projectDir: '/x',
      name: 'Say "Hi"',
      slug: 'say-hi',
      script: undefined,
      port: undefined,
      mode: 'terminal',
      openPath: '/',
      browser: undefined,
      readyTimeoutSeconds: 90,
      packageManager: 'npm',
      nodeVersion: undefined,
      devlaunchVersion: '0.0.0',
    });
    expect(env).toContain('DEVLAUNCH_NAME="Say \\"Hi\\""');
  });
});

describe('planBundle', () => {
  const baseInputs = {
    config: fakeConfig(),
    projectDir: '/Users/me/my-app',
    packageManager: 'npm' as const,
    nodeVersion: { version: '20', source: 'nvmrc' as const },
    devlaunchVersion: '0.0.0',
    infoPlistTemplate:
      '__PROJECT_NAME__ / __PROJECT_SLUG__ / __DEVLAUNCH_VERSION__ / ' +
      '<key>LSUIElement</key>\n<true/>',
    launcherScriptTemplate: '#!/bin/sh\necho placeholder\n',
    stringsTemplate: '# strings\nDEVLAUNCH_ERROR_PORT_IN_USE_TITLE="x"\n',
    vendoredCli: '// vendored cli\n',
    icon: new Uint8Array([1, 2, 3]),
  };

  it('produces the expected name/slug/bundleId/bundlePath with no collision', () => {
    const plan = planBundle(baseInputs, { bundleLocation: '/Users/me/Applications', registry: {} });
    expect(plan).toMatchObject({
      name: 'My App',
      slug: 'my-app',
      bundleId: 'dev.devlaunch.my-app',
      bundlePath: '/Users/me/Applications/My App.app',
      replacingInPlace: false,
    });
  });

  it('replaces in place when the same project already owns this name', () => {
    const registry: BundleRegistry = {
      'My App': {
        projectDir: '/Users/me/my-app',
        bundlePath: '/Users/me/Applications/My App.app',
        devlaunchVersion: '0.0.0',
        createdAt: '',
        updatedAt: '',
      },
    };
    const plan = planBundle(baseInputs, { bundleLocation: '/Users/me/Applications', registry });
    expect(plan.replacingInPlace).toBe(true);
    expect(plan.name).toBe('My App');
  });

  it('throws NAME_COLLISION with a suggested suffix when a different project owns the name', () => {
    const registry: BundleRegistry = {
      'My App': {
        projectDir: '/Users/me/some-other-app',
        bundlePath: '/x',
        devlaunchVersion: '0.0.0',
        createdAt: '',
        updatedAt: '',
      },
    };
    try {
      planBundle(baseInputs, { bundleLocation: '/Users/me/Applications', registry });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DevlaunchError);
      expect((err as DevlaunchError).code).toBe('NAME_COLLISION');
      expect((err as DevlaunchError).message).toContain('"My App-2"');
    }
  });

  it('skips already-taken suffixes when suggesting a name', () => {
    const registry: BundleRegistry = {
      'My App': {
        projectDir: '/other',
        bundlePath: '/x',
        devlaunchVersion: '0',
        createdAt: '',
        updatedAt: '',
      },
      'My App-2': {
        projectDir: '/other-2',
        bundlePath: '/x2',
        devlaunchVersion: '0',
        createdAt: '',
        updatedAt: '',
      },
    };
    try {
      planBundle(baseInputs, { bundleLocation: '/Users/me/Applications', registry });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as DevlaunchError).message).toContain('"My App-3"');
    }
  });

  it('substitutes Info.plist tokens, including a mode-dependent LSUIElement value', () => {
    const terminalPlan = planBundle(baseInputs, { bundleLocation: '/Applications', registry: {} });
    const infoPlist = terminalPlan.files.find((f) => f.relativePath === 'Contents/Info.plist');
    expect(infoPlist?.content).toBe('My App / my-app / 0.0.0 / <key>LSUIElement</key>\n<false/>');

    const headlessPlan = planBundle(
      { ...baseInputs, config: fakeConfig({ mode: 'headless' }) },
      { bundleLocation: '/Applications', registry: {} },
    );
    const headlessPlist = headlessPlan.files.find((f) => f.relativePath === 'Contents/Info.plist');
    expect(headlessPlist?.content).toBe(
      'My App / my-app / 0.0.0 / <key>LSUIElement</key>\n<true/>',
    );
  });

  it('produces exactly the six expected files, with only the launcher executable', () => {
    const plan = planBundle(baseInputs, { bundleLocation: '/Applications', registry: {} });
    expect(plan.files.map((f) => f.relativePath).sort()).toEqual(
      [
        'Contents/Info.plist',
        'Contents/MacOS/launcher',
        'Contents/Resources/devlaunch.mjs',
        'Contents/Resources/icon.icns',
        'Contents/Resources/launcher.env',
        'Contents/Resources/strings.sh',
      ].sort(),
    );
    for (const file of plan.files) {
      expect(Boolean(file.executable)).toBe(file.relativePath === 'Contents/MacOS/launcher');
    }
  });

  it('embeds the icon bytes and vendored CLI text as-is', () => {
    const plan = planBundle(baseInputs, { bundleLocation: '/Applications', registry: {} });
    expect(plan.files.find((f) => f.relativePath === 'Contents/Resources/icon.icns')?.content).toBe(
      baseInputs.icon,
    );
    expect(
      plan.files.find((f) => f.relativePath === 'Contents/Resources/devlaunch.mjs')?.content,
    ).toBe(baseInputs.vendoredCli);
  });

  it('substitutes cleanly against the real runtime Info.plist template', () => {
    const realTemplate = readFileSync(resolve(runtimeTemplatesDir, 'Info.plist'), 'utf8');
    const plan = planBundle(
      { ...baseInputs, infoPlistTemplate: realTemplate },
      { bundleLocation: '/Applications', registry: {} },
    );
    const infoPlist = plan.files.find((f) => f.relativePath === 'Contents/Info.plist')
      ?.content as string;
    expect(infoPlist).toContain('<string>My App</string>');
    expect(infoPlist).toContain('<string>dev.devlaunch.my-app</string>');
    expect(infoPlist).toContain('<string>0.0.0</string>');
    expect(infoPlist).toContain('<false/>'); // terminal mode
    expect(infoPlist).not.toMatch(/__[A-Z_]+__/); // no leftover placeholders
  });
});

/** A minimal in-memory PlatformAdapter for testing bundle write orchestration without disk or macOS. */
function fakePlatformAdapter() {
  const textFiles = new Map<string, string>();
  const writtenBundles: WriteBundleOptions[] = [];
  const spotlightCalls: string[] = [];

  const notImplemented = () => {
    throw new Error('not implemented in fake adapter');
  };

  const adapter: PlatformAdapter = {
    platform: 'macos',
    bundleLocation: () => '/fake/Applications',
    supportDirectory: () => '/fake/support',
    logsDirectory: () => '/fake/logs',
    runDirectory: () => '/fake/support/run',
    writeBundle: async (options) => {
      writtenBundles.push(options);
    },
    registerWithSpotlight: async (bundlePath) => {
      spotlightCalls.push(bundlePath);
    },
    isIndexedBySpotlight: notImplemented,
    readTextFile: async (path) => textFiles.get(path),
    writeTextFile: async (path, content) => {
      textFiles.set(path, content);
    },
    showDialog: notImplemented,
    showNotification: notImplemented,
    openUrl: notImplemented,
    revealInFinder: notImplemented,
  };

  return { adapter, textFiles, writtenBundles, spotlightCalls };
}

describe('writeBundle / readRegistry', () => {
  const plan = {
    name: 'My App',
    slug: 'my-app',
    bundleId: 'dev.devlaunch.my-app',
    bundlePath: '/fake/Applications/My App.app',
    replacingInPlace: false,
    files: [{ relativePath: 'Contents/Info.plist', content: 'x' } as BundleFile],
  };

  it('starts with an empty registry when nothing has been written yet', async () => {
    const { adapter } = fakePlatformAdapter();
    expect(await readRegistry(adapter)).toEqual({});
  });

  it('writes the bundle files, updates the registry, and registers with Spotlight', async () => {
    const { adapter, textFiles, writtenBundles, spotlightCalls } = fakePlatformAdapter();

    await writeBundle(plan, adapter, {
      projectDir: '/Users/me/my-app',
      devlaunchVersion: '0.0.0',
    });

    expect(writtenBundles).toEqual([{ bundlePath: plan.bundlePath, files: plan.files }]);
    expect(spotlightCalls).toEqual([plan.bundlePath]);

    const registry = await readRegistry(adapter);
    expect(registry['My App']).toMatchObject({
      projectDir: '/Users/me/my-app',
      bundlePath: plan.bundlePath,
      devlaunchVersion: '0.0.0',
    });
    expect(textFiles.has('/fake/support/registry.json')).toBe(true);
  });

  it('preserves other registry entries when writing a new one', async () => {
    const { adapter } = fakePlatformAdapter();
    await writeBundle(
      { ...plan, name: 'App One', bundlePath: '/fake/Applications/App One.app' },
      adapter,
      { projectDir: '/x/one', devlaunchVersion: '0.0.0' },
    );
    await writeBundle(
      { ...plan, name: 'App Two', bundlePath: '/fake/Applications/App Two.app' },
      adapter,
      { projectDir: '/x/two', devlaunchVersion: '0.0.0' },
    );

    const registry = await readRegistry(adapter);
    expect(Object.keys(registry).sort()).toEqual(['App One', 'App Two']);
  });
});
