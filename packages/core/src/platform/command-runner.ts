import { execFile } from 'node:child_process';

export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

/**
 * Runs one command and resolves with its result — never rejects on a non-zero
 * exit, since a cancelled dialog or a "not found" check are expected outcomes,
 * not failures. The macOS adapter takes one of these instead of shelling out
 * directly, so tests can swap in a fake and run anywhere.
 */
export type CommandRunner = (command: string, args: readonly string[]) => Promise<CommandResult>;

/** The real runner — spawns an actual process. */
export function createSystemCommandRunner(): CommandRunner {
  return (command, args) =>
    new Promise((resolve) => {
      execFile(command, [...args], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ stdout, stderr, exitCode });
      });
    });
}
