/** One file to write inside a generated .app bundle, path relative to the bundle root. */
export interface BundleFile {
  readonly relativePath: string;
  /** Text for scripts/plists/env files; bytes for the icon. */
  readonly content: string | Uint8Array;
  /** Set on the launcher's own executable (chmod +x). */
  readonly executable?: boolean;
}

export interface WriteBundleOptions {
  /** Absolute path to the .app bundle root, e.g. ~/Applications/My App.app. */
  readonly bundlePath: string;
  readonly files: readonly BundleFile[];
}

export interface DialogOptions {
  readonly title: string;
  readonly message: string;
  /** Button labels, in the order they should appear. */
  readonly actions: readonly string[];
  /** Which action is the highlighted/Enter-key default, if any. */
  readonly defaultAction?: string;
}

export type DialogResult =
  | { readonly outcome: 'action'; readonly action: string }
  | { readonly outcome: 'cancelled' };

export interface NotificationOptions {
  readonly title: string;
  readonly body: string;
}

/**
 * Everything that touches the real machine, behind one interface. Core's
 * other modules (detect, config, redact, errors, report) stay pure; only
 * code that needs an adapter reaches out to it, and only this module ever
 * writes a file, spawns a process, or shows UI.
 */
export interface PlatformAdapter {
  readonly platform: 'macos' | 'unsupported';

  /** Where generated .app bundles live (~/Applications). */
  bundleLocation(): string;
  /** Where devlaunch keeps its own state: the bundle registry, PID files, logs. */
  supportDirectory(): string;
  logsDirectory(): string;
  runDirectory(): string;

  writeBundle(options: WriteBundleOptions): Promise<void>;
  registerWithSpotlight(bundlePath: string): Promise<void>;
  isIndexedBySpotlight(bundlePath: string): Promise<boolean>;

  /** Small persisted text files — the bundle registry today, PID files later. Undefined if missing. */
  readTextFile(path: string): Promise<string | undefined>;
  writeTextFile(path: string, content: string): Promise<void>;

  /** Converts a PNG (any size) at an absolute path into .icns bytes, via sips + iconutil. */
  convertPngToIcns(pngPath: string): Promise<Uint8Array>;

  showDialog(options: DialogOptions): Promise<DialogResult>;
  showNotification(options: NotificationOptions): Promise<void>;
  openUrl(url: string): Promise<void>;
  revealInFinder(path: string): Promise<void>;
}
