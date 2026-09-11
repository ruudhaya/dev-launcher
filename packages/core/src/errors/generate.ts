import { listErrorEntries } from './catalog.js';
import type { ErrorCatalogEntry } from './types.js';

/**
 * Pure text generators over the error catalog. These produce strings only —
 * writing them to disk is a build-time concern, done by
 * packages/core/scripts/generate-error-docs.mjs, never by the library itself.
 */

const GENERATED_NOTICE =
  'GENERATED FILE. Do not edit by hand — edit packages/core/src/errors/catalog.ts and run ' +
  '`pnpm --filter @devlaunch/core generate`.';

/** Escape a string for safe embedding inside a double-quoted POSIX shell literal. */
function shellEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

function shellVarName(code: string, suffix: string): string {
  return `DEVLAUNCH_ERROR_${code}_${suffix}`;
}

/**
 * A shell strings file: one variable per catalog field, for
 * packages/runtime/templates/strings.sh. The runtime sources this file and
 * refers to variables by name — it never hardcodes user-facing text itself.
 */
export function generateShellStrings(
  entries: readonly ErrorCatalogEntry[] = listErrorEntries(),
): string {
  const lines: string[] = [
    `# ${GENERATED_NOTICE}`,
    '#',
    '# One block per devlaunch error code. Sourced by launcher.sh; never edited there.',
    '',
  ];

  for (const entry of entries) {
    lines.push(`# ${entry.code} (${entry.category})`);
    lines.push(`${shellVarName(entry.code, 'TITLE')}="${shellEscape(entry.title)}"`);
    lines.push(`${shellVarName(entry.code, 'EXPLANATION')}="${shellEscape(entry.explanation)}"`);
    lines.push(`${shellVarName(entry.code, 'ACTIONS')}="${shellEscape(entry.actions.join('|'))}"`);
    lines.push(`${shellVarName(entry.code, 'AGENT_HINT')}="${shellEscape(entry.agentHint)}"`);
    lines.push('');
  }

  return lines.join('\n');
}

function markdownForEntry(entry: ErrorCatalogEntry): string {
  const actions = entry.actions.map((action) => `- ${action}`).join('\n');
  return [
    `## ${entry.code}`,
    '',
    `**Category:** ${entry.category}`,
    '',
    `**${entry.title}**`,
    '',
    entry.explanation,
    '',
    '**Dialog actions:**',
    '',
    actions,
    '',
    '**For coding agents:**',
    '',
    entry.agentHint,
    '',
    '**Developer detail:**',
    '',
    entry.developerDetail,
    '',
  ].join('\n');
}

/**
 * A Markdown reference of every error code, its meaning, and what to do about
 * it. Used both as the site's docs page and as the skill's error reference —
 * see generate-error-docs.mjs for where each copy lands.
 */
export function generateMarkdownReference(
  entries: readonly ErrorCatalogEntry[] = listErrorEntries(),
): string {
  const header = [
    `<!-- ${GENERATED_NOTICE} -->`,
    '',
    'Every failure devlaunch can report has a stable code. If you hit one that',
    "isn't listed here, that's itself a bug — please file it.",
    '',
  ].join('\n');

  return [header, ...entries.map(markdownForEntry)].join('\n');
}
