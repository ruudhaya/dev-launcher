import type { DevScriptCandidate } from './types.js';

/** Checked in this order; the first one present in package.json "scripts" wins. */
const DEV_SCRIPT_NAME_PRIORITY: readonly string[] = ['dev', 'start', 'develop', 'serve'];

/** Every script in `scripts` that matches a known dev-script name, in priority order. */
export function detectDevScriptCandidates(
  scripts: Record<string, string> | undefined,
): DevScriptCandidate[] {
  if (!scripts) {
    return [];
  }
  const candidates: DevScriptCandidate[] = [];
  for (const name of DEV_SCRIPT_NAME_PRIORITY) {
    const command = scripts[name];
    if (typeof command === 'string' && command.length > 0) {
      candidates.push({ name, command });
    }
  }
  return candidates;
}

/** The best guess among detected candidates — the highest-priority one found. */
export function pickDevScript(
  candidates: readonly DevScriptCandidate[],
): DevScriptCandidate | undefined {
  return candidates[0];
}

const PORT_FLAG_PATTERN = /(?:--port(?:=|\s+)|-p\s+)(\d{2,5})\b/;

/** Pull an explicit port out of a dev script's own CLI flags (`vite --port 4001`). */
export function parsePortFromCommand(command: string): number | undefined {
  const match = command.match(PORT_FLAG_PATTERN);
  return match?.[1] ? Number(match[1]) : undefined;
}
