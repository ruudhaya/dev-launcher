#!/usr/bin/env node
/**
 * Writes the config JSON Schema to schemas/config.schema.json at the repo
 * root. Build-time tool, not part of the published library — see
 * generate-error-docs.mjs for why this lives outside src/.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateConfigSchemaJson } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const target = resolve(repoRoot, 'schemas/config.schema.json');

await mkdir(dirname(target), { recursive: true });
await writeFile(target, generateConfigSchemaJson());
console.log(`wrote ${target}`);
