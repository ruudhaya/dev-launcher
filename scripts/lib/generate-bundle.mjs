#!/usr/bin/env node
/**
 * Generates a real launcher .app bundle for one project, using
 * @devlaunch/core directly (no CLI yet — that's L1-3). Used by
 * scripts/smoke-macos.sh to exercise the real launcher.sh end to end.
 *
 * Respects $HOME, so the caller should set it to a temp directory —
 * otherwise this would write to the real ~/Applications and
 * ~/Library/Application Support/devlaunch/registry.json.
 *
 * Usage: generate-bundle.mjs <projectDir> <bundleLocation> [flagsJson]
 * On success, prints three lines: the bundle's absolute path, its slug
 * (for locating its log/PID files), and its resolved port (may be blank).
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORE_VERSION,
  buildDefaultsFromDetection,
  createPlatformAdapter,
  detectProject,
  planBundle,
  readRegistry,
  resolveConfig,
  writeBundle,
} from '../../packages/core/dist/index.js';

const [, , projectDirArg, bundleLocationArg, flagsJson] = process.argv;
if (!projectDirArg || !bundleLocationArg) {
  console.error('usage: generate-bundle.mjs <projectDir> <bundleLocation> [flagsJson]');
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const runtimeDir = resolve(repoRoot, 'packages/runtime');

const projectDir = resolve(projectDirArg);
const bundleLocation = resolve(bundleLocationArg);
const flags = { mode: 'headless', ...(flagsJson ? JSON.parse(flagsJson) : {}) };

const detection = detectProject(projectDir);
const defaults = buildDefaultsFromDetection(detection);
const projectPackageJson = JSON.parse(
  readFileSync(resolve(projectDir, 'package.json'), 'utf8'),
);
const config = resolveConfig({
  defaults,
  packageJsonLauncher: projectPackageJson.launcher,
  flags,
});
if (Array.isArray(config)) {
  throw new Error('generate-bundle.mjs does not support monorepo array configs yet');
}

// The full command to run: config.script names an npm script ("<packageManager>
// run <script>"), but a project with none of its own — only an imported
// .claude/launch.json run config — has no script name to build that from.
const command = config.script
  ? `${detection.packageManager} run ${config.script}`
  : detection.importedRunConfig?.launchers[0]?.command;
if (!command) {
  throw new Error(`${projectDir}: no script and no imported run config — nothing to run`);
}

const adapter = createPlatformAdapter();
const registry = await readRegistry(adapter);

const plan = planBundle(
  {
    config,
    command,
    projectDir,
    packageManager: detection.packageManager,
    nodeVersion: detection.nodeVersion,
    devlaunchVersion: CORE_VERSION,
    infoPlistTemplate: readFileSync(resolve(runtimeDir, 'templates/Info.plist'), 'utf8'),
    launcherScriptTemplate: readFileSync(resolve(runtimeDir, 'templates/launcher.sh'), 'utf8'),
    stringsTemplate: readFileSync(resolve(runtimeDir, 'templates/strings.sh'), 'utf8'),
    vendoredCli: '// devlaunch CLI not implemented yet — see L1-3.\n',
    icon: readFileSync(resolve(runtimeDir, 'assets/default-icon.icns')),
  },
  { bundleLocation, registry },
);

await writeBundle(plan, adapter, { projectDir, devlaunchVersion: CORE_VERSION });

console.log(plan.bundlePath);
console.log(plan.slug);
console.log(config.port ?? '');
