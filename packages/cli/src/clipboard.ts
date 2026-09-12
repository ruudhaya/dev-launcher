import { spawn } from 'node:child_process';

/** Pipes text into `pbcopy`. The one clipboard primitive the CLI needs. */
export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('pbcopy');
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pbcopy exited with code ${code}`));
      }
    });
    proc.stdin.end(text);
  });
}
