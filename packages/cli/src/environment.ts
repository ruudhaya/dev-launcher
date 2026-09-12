import { execFileSync } from 'node:child_process';
import type { ReportEnvironment } from '@devlaunch/core';

/** `sw_vers -productVersion`, e.g. "14.5". undefined off macOS or if it fails. */
export function macosVersion(): string | undefined {
  try {
    return execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

export interface BuildReportEnvironmentInputs {
  readonly devlaunchVersion: string;
  readonly packageManager: string;
  /** The launcher's own resolved Node version/source, if known — falls back to the running process's. */
  readonly nodeVersion?: string;
  readonly nodeVersionSource?: string;
}

/** Assembles the environment block every report/doctor-ish output shares. */
export function buildReportEnvironment(inputs: BuildReportEnvironmentInputs): ReportEnvironment {
  return {
    macOSVersion: macosVersion(),
    arch: process.arch,
    nodeVersion: inputs.nodeVersion ?? process.version.replace(/^v/, ''),
    nodeVersionSource: inputs.nodeVersionSource ?? 'current',
    packageManager: inputs.packageManager,
    devlaunchVersion: inputs.devlaunchVersion,
  };
}
