#!/usr/bin/env node
/**
 * Writes the three generated outputs of the error catalog to disk:
 *   - packages/runtime/templates/strings.sh    (sourced by the launcher runtime)
 *   - apps/site/src/content/docs/docs/errors.md (the site's error reference)
 *   - packages/skill/devlaunch/references/errors.md (the agent skill's copy)
 *
 * This is a build-time tool, not part of the published library — @devlaunch/core
 * itself never touches the filesystem. Run via `pnpm --filter @devlaunch/core
 * generate` (after a build, since it imports the built dist).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMarkdownReference, generateShellStrings } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

const targets = [
  {
    path: resolve(repoRoot, 'packages/runtime/templates/strings.sh'),
    content: generateShellStrings(),
  },
  {
    path: resolve(repoRoot, 'apps/site/src/content/docs/docs/errors.md'),
    content: [
      '---',
      'title: Error reference',
      'description: Every error code devlaunch can report, what it means, and what to do about it.',
      '---',
      '',
      generateMarkdownReference(),
    ].join('\n'),
  },
  {
    path: resolve(repoRoot, 'packages/skill/devlaunch/references/errors.md'),
    content: generateMarkdownReference(),
  },
];

for (const target of targets) {
  await mkdir(dirname(target.path), { recursive: true });
  await writeFile(target.path, target.content);
  console.log(`wrote ${target.path}`);
}
