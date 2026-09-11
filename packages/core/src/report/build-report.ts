import { getErrorEntry } from '../errors/index.js';
import { redactText } from '../redact/index.js';
import type { ReportEnvironment, ReportInput } from './types.js';

/** Soft cap so a pasted report stays practical in a chat or an issue. */
export const MAX_REPORT_CHARACTERS = 12_000;
/** However many lines the caller passes, only this many (the most recent) are included. */
export const REPORT_LOG_LINE_LIMIT = 80;

function formatEnvironment(env: ReportEnvironment): string {
  const node = env.nodeVersion
    ? `${env.nodeVersion} (from ${env.nodeVersionSource ?? 'unknown'})`
    : 'not found';
  return [
    `- macOS: ${env.macOSVersion ?? 'unknown'}`,
    `- Architecture: ${env.arch}`,
    `- Node: ${node}`,
    `- Package manager: ${env.packageManager}`,
    `- devlaunch: ${env.devlaunchVersion}`,
  ].join('\n');
}

function formatConfig(config: Readonly<Record<string, unknown>>): string {
  const entries = Object.entries(config).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return '(no config)';
  }
  return entries.map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`).join('\n');
}

function formatSteps(steps: readonly string[]): string {
  if (steps.length === 0) {
    return '(none recorded)';
  }
  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
}

/**
 * Build the `devlaunch report v1` text behind [Copy Report] / `devlaunch
 * report`. Fully redacted and capped at ~12k characters so it's always safe
 * and practical to paste into an agent's chat or a GitHub issue.
 */
export function buildReport(input: ReportInput): string {
  const entry = getErrorEntry(input.errorCode);
  const secretValues = input.secretValues ?? [];

  const head = redactText(
    [
      'devlaunch report v1',
      '',
      `Summary: ${input.summary}`,
      '',
      `Error: ${entry.code} — ${entry.title}`,
      `For coding agents: ${entry.agentHint}`,
      '',
      'Steps attempted:',
      formatSteps(input.stepsAttempted),
      '',
      'Environment:',
      formatEnvironment(input.environment),
      '',
      'Config:',
      formatConfig(input.config),
      '',
      '',
    ].join('\n'),
    secretValues,
  );

  const closing = redactText(
    '\nRun `npx devlaunch doctor --json` for a full environment check.\n',
    secretValues,
  );

  const logLines = input.logLines
    .slice(-REPORT_LOG_LINE_LIMIT)
    .map((line) => redactText(line, secretValues));

  const logsHeader = `Logs (last ${logLines.length} lines, redacted):\n\`\`\`\n`;
  const logsFooter = '\n```\n';
  const truncationNotice = `(earlier lines omitted to keep this report under ${MAX_REPORT_CHARACTERS} characters)\n`;

  const overhead =
    head.length + logsHeader.length + logsFooter.length + closing.length + truncationNotice.length;
  const budgetForLogs = Math.max(0, MAX_REPORT_CHARACTERS - overhead);

  let truncated = false;
  while (logLines.length > 0 && logLines.join('\n').length > budgetForLogs) {
    logLines.shift(); // drop the oldest kept line first — keep the most recent ones
    truncated = true;
  }

  const logsBody = logLines.join('\n');
  const logsSection = truncated
    ? `${logsHeader}${truncationNotice}${logsBody}${logsFooter}`
    : `${logsHeader}${logsBody}${logsFooter}`;

  return `${head}${logsSection}${closing}`;
}
