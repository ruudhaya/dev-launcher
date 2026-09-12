#!/usr/bin/env node
/**
 * Generates the default icon devlaunch ships for projects with no icon
 * candidate of their own: a flat solid-color square, converted to a real
 * multi-resolution .icns via sips + iconutil (macOS only — this is a one-time
 * build tool, run when the asset needs regenerating, not part of the regular
 * `generate` chain). Writes packages/runtime/assets/default-icon.icns.
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ICONSET_ENTRIES } from '../dist/index.js';
import { makeSolidPng } from './make-solid-png.mjs';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

// Tailwind's blue-600 — a plain, neutral placeholder until there's a real mark.
const DEVLAUNCH_BLUE = [37, 99, 235];

const workDir = await mkdtemp(join(tmpdir(), 'devlaunch-default-icon-'));
try {
  const basePngPath = join(workDir, 'base.png');
  await writeFile(basePngPath, makeSolidPng(1024, DEVLAUNCH_BLUE));

  const iconsetDir = join(workDir, 'icon.iconset');
  await mkdir(iconsetDir, { recursive: true });

  for (const { fileName, pixels } of ICONSET_ENTRIES) {
    await run('sips', [
      '-z',
      String(pixels),
      String(pixels),
      basePngPath,
      '--out',
      join(iconsetDir, fileName),
    ]);
  }

  const icnsPath = join(workDir, 'icon.icns');
  await run('iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath]);

  const target = resolve(repoRoot, 'packages/runtime/assets/default-icon.icns');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await readFile(icnsPath));
  console.log(`wrote ${target}`);
} finally {
  await rm(workDir, { recursive: true, force: true });
}
