export type LauncherMode = 'terminal' | 'headless';

/**
 * Every field a project can configure, in package.json's "launcher" field or
 * .devlaunch.local.json. All optional — each config layer supplies whatever
 * it has, and resolveConfig fills in the rest.
 */
export interface LauncherConfigFields {
  readonly name?: string;
  /** The package.json script to run (e.g. "dev"). Undefined if only an imported run config supplies a command. */
  readonly script?: string;
  readonly port?: number;
  readonly mode?: LauncherMode;
  /** Path to an icon image, relative to the project root. */
  readonly icon?: string;
  readonly openPath?: string;
  /** Browser to open in; the system default browser if omitted. */
  readonly browser?: string;
  readonly readyTimeoutSeconds?: number;
}

/** package.json's "launcher" field: one config, or an array (one per monorepo app). */
export type RawLauncherConfig = LauncherConfigFields | readonly LauncherConfigFields[];

/** The fully-merged config for one launcher. Fields with a real default are always present. */
export interface ResolvedLauncherConfig {
  readonly name: string;
  readonly script: string | undefined;
  readonly port: number | undefined;
  readonly mode: LauncherMode;
  readonly icon: string | undefined;
  readonly openPath: string;
  readonly browser: string | undefined;
  readonly readyTimeoutSeconds: number;
}
