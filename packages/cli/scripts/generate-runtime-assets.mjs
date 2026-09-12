#!/usr/bin/env node
/**
 * Embeds @devlaunch/runtime's templates and default icon into a TS module
 * the CLI can import — the published `devlaunch` package is a single file
 * with no runtime dependencies (see CLAUDE.md), so it can't read these from
 * a sibling package's files on disk at runtime. Regenerated on every build;
 * not committed (see .gitignore) — packages/runtime/templates is the single
 * source of truth.
 *
 * strings.sh must already be generated (see
 * packages/core/scripts/generate-error-docs.mjs) before this runs — the
 * root `pnpm build` order (core before cli) guarantees that.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const runtimeDir = resolve(repoRoot, 'packages/runtime');
const outFile = resolve(here, '../src/generated/runtime-assets.ts');

const [infoPlist, launcherScript, strings, runCommand, defaultIcon] = await Promise.all([
  readFile(resolve(runtimeDir, 'templates/Info.plist'), 'utf8'),
  readFile(resolve(runtimeDir, 'templates/launcher.sh'), 'utf8'),
  readFile(resolve(runtimeDir, 'templates/strings.sh'), 'utf8'),
  readFile(resolve(runtimeDir, 'templates/run.command'), 'utf8'),
  readFile(resolve(runtimeDir, 'assets/default-icon.icns')),
]);

function tsStringLiteral(text) {
  return JSON.stringify(text);
}

const contents = `// GENERATED FILE. Do not edit by hand — run \`pnpm --filter devlaunch generate\`.
// Source: packages/runtime/templates and packages/runtime/assets.

export const INFO_PLIST_TEMPLATE: string = ${tsStringLiteral(infoPlist)};
export const LAUNCHER_SCRIPT_TEMPLATE: string = ${tsStringLiteral(launcherScript)};
export const STRINGS_TEMPLATE: string = ${tsStringLiteral(strings)};
export const RUN_COMMAND_TEMPLATE: string = ${tsStringLiteral(runCommand)};
export const DEFAULT_ICON_BASE64: string = ${tsStringLiteral(defaultIcon.toString('base64'))};
`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, contents);
console.log(`wrote ${outFile}`);
