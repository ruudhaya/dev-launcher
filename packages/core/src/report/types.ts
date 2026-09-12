/** Plain, already-resolved environment facts — report building does no I/O of its own. */
export interface ReportEnvironment {
  readonly macOSVersion: string | undefined;
  readonly arch: string;
  readonly nodeVersion: string | undefined;
  readonly nodeVersionSource: string | undefined;
  readonly packageManager: string;
  readonly devlaunchVersion: string;
}

export interface ReportInput {
  /** One-line, human summary of what happened. */
  readonly summary: string;
  /**
   * Omitted when the report isn't about a failure at all — e.g. a person or
   * agent running `devlaunch report` on a healthy launcher just to get a
   * diagnostic snapshot. When present, the report includes the catalog's
   * title and agentHint for it.
   */
  readonly errorCode?: import('../errors/index.js').DevlaunchErrorCode;
  /** What devlaunch tried, in order — shown as a numbered list. */
  readonly stepsAttempted: readonly string[];
  readonly environment: ReportEnvironment;
  /** The resolved launcher config, as a plain object (undefined fields are omitted). */
  readonly config: Readonly<Record<string, unknown>>;
  /** Raw log lines; only the most recent REPORT_LOG_LINE_LIMIT are kept. */
  readonly logLines: readonly string[];
  /** Secret values to redact out of the whole report (e.g. from createRedactor). */
  readonly secretValues?: Iterable<string>;
}
