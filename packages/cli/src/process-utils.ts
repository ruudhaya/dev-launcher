import { execFileSync } from 'node:child_process';

/** True if a process with this PID exists and we can signal it. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function directChildren(pid: number): number[] {
  try {
    const output = execFileSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' });
    return output
      .split('\n')
      .map((line) => Number.parseInt(line.trim(), 10))
      .filter((n) => Number.isInteger(n));
  } catch {
    return []; // pgrep exits non-zero when there are no matches
  }
}

/**
 * Recursively signals PID and everything it spawned — mirrors launcher.sh's
 * own kill_tree (see the comment there for why a plain process-group kill
 * isn't enough: a dev command that supervises a child, like "npm run dev"
 * spawning vite, can leave that child running after just the top PID dies).
 */
export function killTree(pid: number, signal: NodeJS.Signals = 'SIGTERM'): void {
  for (const child of directChildren(pid)) {
    killTree(child, signal);
  }
  try {
    process.kill(pid, signal);
  } catch {
    // Already gone — fine.
  }
}

/** Prompts a yes/no question. Only call this when ctx.interactive is true. */
export async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const suffix = defaultYes ? '[Y/n]' : '[y/N]';
    const answer = (await rl.question(`${question} ${suffix} `)).trim().toLowerCase();
    if (answer === '') return defaultYes;
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Prompts to pick one of a list of names, by number or by typing the name
 * itself — used by `init` to disambiguate a monorepo with more than one
 * launchable app. Only call this when ctx.interactive is true. Returns
 * undefined on an empty/invalid answer (never re-prompts, non-interactive
 * use never reaches here anyway).
 */
export async function promptChoice(
  question: string,
  choices: readonly string[],
): Promise<string | undefined> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const list = choices.map((choice, index) => `  ${index + 1}. ${choice}`).join('\n');
    const answer = (await rl.question(`${question}\n${list}\n> `)).trim();
    const index = Number.parseInt(answer, 10);
    if (Number.isInteger(index) && index >= 1 && index <= choices.length) {
      return choices[index - 1];
    }
    return choices.includes(answer) ? answer : undefined;
  } finally {
    rl.close();
  }
}
