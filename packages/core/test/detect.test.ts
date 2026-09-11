import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { claudeLaunchJsonImporter } from '../src/detect/importers/claude-launch-json.js';
import {
  detectDevScriptCandidates,
  detectFramework,
  detectIconCandidates,
  detectNodeVersion,
  detectPackageManager,
  detectProject,
  detectWorkspaceApps,
  GENERIC_READY_PATTERN,
  parsePortFromCommand,
  pickDevScript,
} from '../src/detect/index.js';
import { DevlaunchError } from '../src/errors/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, '../../../examples');

function makeTempProject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'devlaunch-detect-'));
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(dir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return dir;
}

const tempDirs: string[] = [];
function tempProject(files: Record<string, string>): string {
  const dir = makeTempProject(files);
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('detectPackageManager', () => {
  it('prefers the explicit "packageManager" field', () => {
    const dir = tempProject({ 'pnpm-lock.yaml': '' });
    expect(detectPackageManager(dir, { packageManager: 'yarn@4.0.0' })).toBe('yarn');
  });

  it('falls back to the lockfile present on disk', () => {
    expect(detectPackageManager(tempProject({ 'pnpm-lock.yaml': '' }), {})).toBe('pnpm');
    expect(detectPackageManager(tempProject({ 'yarn.lock': '' }), {})).toBe('yarn');
    expect(detectPackageManager(tempProject({ 'bun.lock': '' }), {})).toBe('bun');
    expect(detectPackageManager(tempProject({ 'package-lock.json': '{}' }), {})).toBe('npm');
  });

  it('defaults to npm with no signal at all', () => {
    expect(detectPackageManager(tempProject({}), {})).toBe('npm');
  });
});

describe('detectDevScriptCandidates / pickDevScript', () => {
  it('finds candidates in priority order: dev, start, develop, serve', () => {
    const candidates = detectDevScriptCandidates({
      serve: 'serve .',
      start: 'node index.js',
      dev: 'vite',
    });
    expect(candidates.map((c) => c.name)).toEqual(['dev', 'start', 'serve']);
    expect(pickDevScript(candidates)?.name).toBe('dev');
  });

  it('returns nothing for a project with no scripts', () => {
    expect(detectDevScriptCandidates(undefined)).toEqual([]);
    expect(pickDevScript([])).toBeUndefined();
  });
});

describe('parsePortFromCommand', () => {
  it('reads --port <n>, --port=<n>, and -p <n>', () => {
    expect(parsePortFromCommand('vite --port 4001')).toBe(4001);
    expect(parsePortFromCommand('vite --port=4002')).toBe(4002);
    expect(parsePortFromCommand('http-server -p 8080')).toBe(8080);
  });

  it('returns undefined when there is no port flag', () => {
    expect(parsePortFromCommand('vite')).toBeUndefined();
  });
});

describe('detectFramework', () => {
  const cases: [string, Record<string, string>][] = [
    ['vite', { vite: '^5.0.0' }],
    ['next', { next: '^14.0.0' }],
    ['react-scripts', { 'react-scripts': '^5.0.0' }],
    ['remix', { '@remix-run/dev': '^2.0.0' }],
    ['astro', { astro: '^4.0.0' }],
    ['nuxt', { nuxt: '^3.0.0' }],
    ['sveltekit', { '@sveltejs/kit': '^2.0.0', vite: '^5.0.0' }],
  ];

  it.each(cases)('detects %s', (name, deps) => {
    expect(detectFramework(deps)?.name).toBe(name);
  });

  it('prefers the more specific framework over its underlying build tool', () => {
    // SvelteKit depends on vite internally — must not be detected as plain vite.
    expect(detectFramework({ '@sveltejs/kit': '^2.0.0', vite: '^5.0.0' })?.name).toBe('sveltekit');
  });

  it('returns undefined, with a generic fallback pattern, for an unknown stack', () => {
    expect(detectFramework({ express: '^4.0.0' })).toBeUndefined();
    expect(GENERIC_READY_PATTERN.test('Server running at http://localhost:4321')).toBe(true);
  });
});

describe('detectNodeVersion', () => {
  it('prefers .nvmrc over everything else', () => {
    const dir = tempProject({ '.nvmrc': '20\n', '.node-version': '18\n' });
    expect(detectNodeVersion(dir, { engines: { node: '16' } })).toEqual({
      version: '20',
      source: 'nvmrc',
    });
  });

  it('falls back to .node-version, then volta, then engines', () => {
    expect(detectNodeVersion(tempProject({ '.node-version': '18.19.0' }), {})).toEqual({
      version: '18.19.0',
      source: 'node-version',
    });
    expect(detectNodeVersion(tempProject({}), { volta: { node: '20.10.0' } })).toEqual({
      version: '20.10.0',
      source: 'volta',
    });
    expect(detectNodeVersion(tempProject({}), { engines: { node: '>=18' } })).toEqual({
      version: '>=18',
      source: 'engines',
    });
  });

  it('returns undefined with no signal', () => {
    expect(detectNodeVersion(tempProject({}), {})).toBeUndefined();
  });
});

describe('detectWorkspaceApps', () => {
  it('expands a pnpm-workspace.yaml "apps/*" pattern', () => {
    const dir = tempProject({
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n',
      'apps/web/package.json': JSON.stringify({ name: '@x/web', scripts: { dev: 'vite' } }),
      'apps/admin/package.json': JSON.stringify({ name: '@x/admin', scripts: {} }),
    });
    const apps = detectWorkspaceApps(dir, {});
    expect(apps).toEqual(
      expect.arrayContaining([
        { name: '@x/web', dir: 'apps/web', devScript: 'vite' },
        { name: '@x/admin', dir: 'apps/admin', devScript: undefined },
      ]),
    );
  });

  it('reads package.json "workspaces" for npm/yarn-style monorepos', () => {
    const dir = tempProject({
      'packages/a/package.json': JSON.stringify({ name: 'a', scripts: { dev: 'node a.js' } }),
    });
    const apps = detectWorkspaceApps(dir, { workspaces: ['packages/*'] });
    expect(apps).toEqual([{ name: 'a', dir: 'packages/a', devScript: 'node a.js' }]);
  });

  it('returns an empty list for a non-monorepo project', () => {
    expect(detectWorkspaceApps(tempProject({}), {})).toEqual([]);
  });

  it('matches the real examples/pnpm-monorepo fixture', () => {
    const dir = join(examplesDir, 'pnpm-monorepo');
    const apps = detectWorkspaceApps(
      dir,
      JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')),
    );
    expect(apps.map((a) => a.name).sort()).toEqual(['@example/admin', '@example/web']);
  });
});

describe('detectIconCandidates', () => {
  it('lists an existing configured icon first', () => {
    const dir = tempProject({
      'assets/icon.png': 'x',
      'public/logo.png': 'x',
    });
    const candidates = detectIconCandidates(dir, { launcher: { icon: 'assets/icon.png' } });
    expect(candidates[0]).toEqual({ path: 'assets/icon.png', source: 'configured' });
  });

  it('ignores a configured icon that does not exist on disk', () => {
    const dir = tempProject({ 'public/favicon.png': 'x' });
    const candidates = detectIconCandidates(dir, { launcher: { icon: 'nope.png' } });
    expect(candidates.every((c) => c.source !== 'configured')).toBe(true);
  });

  it('finds framework-convention icons that exist', () => {
    const dir = tempProject({ 'app/icon.png': 'x' });
    expect(detectIconCandidates(dir, {})).toEqual([
      { path: 'app/icon.png', source: 'app/icon.png' },
    ]);
  });

  it('returns an empty list when nothing exists', () => {
    expect(detectIconCandidates(tempProject({}), {})).toEqual([]);
  });
});

describe('claudeLaunchJsonImporter (.claude/launch.json)', () => {
  it('returns undefined when there is no launch.json', () => {
    expect(claudeLaunchJsonImporter.detect(tempProject({}))).toBeUndefined();
  });

  it('imports a runtimeExecutable/runtimeArgs configuration, comments and all', () => {
    const dir = tempProject({
      '.claude/launch.json': [
        '{',
        '  // a comment Claude Code left in the file',
        '  "version": "0.0.1",',
        '  "configurations": [',
        '    { "name": "web", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }',
        '  ]',
        '}',
      ].join('\n'),
    });
    const result = claudeLaunchJsonImporter.detect(dir);
    expect(result).toEqual({
      source: '.claude/launch.json',
      launchers: [{ name: 'web', command: 'npm run dev', cwd: '.', port: 3000 }],
    });
  });

  it('imports a program/args configuration and resolves the workspaceFolder token', () => {
    const dir = tempProject({
      '.claude/launch.json': JSON.stringify({
        configurations: [
          {
            name: 'api',
            program: 'server.js',
            args: ['--verbose'],
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal token from launch.json's own format.
            cwd: '${workspaceFolder}/server',
          },
        ],
      }),
    });
    const result = claudeLaunchJsonImporter.detect(dir);
    expect(result?.launchers[0]).toEqual({
      name: 'api',
      command: 'node server.js --verbose',
      cwd: './server',
      port: undefined,
    });
  });

  it('supports multiple configurations (frontend + api)', () => {
    const dir = tempProject({
      '.claude/launch.json': JSON.stringify({
        configurations: [
          { name: 'frontend', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 3000 },
          {
            name: 'api',
            runtimeExecutable: 'npm',
            runtimeArgs: ['run', 'start'],
            cwd: 'server',
            port: 8080,
          },
        ],
      }),
    });
    const result = claudeLaunchJsonImporter.detect(dir);
    expect(result?.launchers.map((l) => l.name)).toEqual(['frontend', 'api']);
  });

  it('throws RUN_CONFIG_INVALID for malformed JSON', () => {
    const dir = tempProject({ '.claude/launch.json': '{ not json' });
    expect(() => claudeLaunchJsonImporter.detect(dir)).toThrow(DevlaunchError);
    try {
      claudeLaunchJsonImporter.detect(dir);
    } catch (err) {
      expect((err as DevlaunchError).code).toBe('RUN_CONFIG_INVALID');
    }
  });

  it('throws RUN_CONFIG_INVALID when "configurations" is missing', () => {
    const dir = tempProject({ '.claude/launch.json': JSON.stringify({ version: '0.0.1' }) });
    expect(() => claudeLaunchJsonImporter.detect(dir)).toThrow(DevlaunchError);
  });

  it('never writes to launch.json', () => {
    const dir = tempProject({
      '.claude/launch.json': JSON.stringify({
        configurations: [{ name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'] }],
      }),
    });
    const before = readFileSync(join(dir, '.claude/launch.json'), 'utf8');
    claudeLaunchJsonImporter.detect(dir);
    const after = readFileSync(join(dir, '.claude/launch.json'), 'utf8');
    expect(after).toBe(before);
  });
});

describe('detectProject (integration, against real fixtures)', () => {
  it('detects examples/vite-react', () => {
    const detection = detectProject(join(examplesDir, 'vite-react'));
    expect(detection.packageManager).toBe('npm');
    expect(detection.devScript?.command).toBe('vite');
    expect(detection.framework?.name).toBe('vite');
    expect(detection.port).toBe(5173); // framework default; no --port flag or config
    expect(detection.nodeVersion).toEqual({ version: '20', source: 'nvmrc' });
    expect(detection.source).toBe('heuristic');
  });

  it('detects examples/next-app', () => {
    const detection = detectProject(join(examplesDir, 'next-app'));
    expect(detection.packageManager).toBe('pnpm');
    expect(detection.framework?.name).toBe('next');
    expect(detection.port).toBe(3000);
  });

  it('detects examples/pnpm-monorepo, including its workspace apps', () => {
    const detection = detectProject(join(examplesDir, 'pnpm-monorepo'));
    expect(detection.packageManager).toBe('pnpm');
    expect(detection.workspaceApps.map((a) => a.name).sort()).toEqual([
      '@example/admin',
      '@example/web',
    ]);
  });

  it('detects examples/with-claude-launch-json purely from the imported run config', () => {
    const detection = detectProject(join(examplesDir, 'with-claude-launch-json'));
    expect(detection.source).toBe('.claude/launch.json');
    expect(detection.devScript).toBeUndefined(); // package.json has no dev/start script
    expect(detection.importedRunConfig?.launchers[0]).toMatchObject({
      command: 'node server.js',
      port: 4173,
    });
    expect(detection.port).toBe(4173);
  });

  it('does not throw NO_DEV_SCRIPT just because .claude/launch.json covers it', () => {
    expect(() => detectProject(join(examplesDir, 'with-claude-launch-json'))).not.toThrow();
  });

  it('detects the .nvmrc in examples/broken/node-version-mismatch', () => {
    const detection = detectProject(join(examplesDir, 'broken/node-version-mismatch'));
    expect(detection.nodeVersion).toEqual({ version: '99.99.99', source: 'nvmrc' });
  });

  it('throws NO_PACKAGE_JSON for a directory with no package.json', () => {
    const dir = tempProject({ 'index.html': '<html></html>' });
    expect(() => detectProject(dir)).toThrow(DevlaunchError);
    try {
      detectProject(dir);
    } catch (err) {
      expect((err as DevlaunchError).code).toBe('NO_PACKAGE_JSON');
    }
  });

  it('throws NO_DEV_SCRIPT when neither scripts nor an imported run config exist', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ name: 'x', scripts: { build: 'x' } }),
    });
    try {
      detectProject(dir);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as DevlaunchError).code).toBe('NO_DEV_SCRIPT');
    }
  });

  it('throws CONFIG_INVALID for a package.json that is not valid JSON', () => {
    const dir = tempProject({ 'package.json': '{ not json' });
    try {
      detectProject(dir);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as DevlaunchError).code).toBe('CONFIG_INVALID');
    }
  });
});
