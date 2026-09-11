/**
 * Loose shape of package.json — we only ever read a handful of fields and
 * projects are free to put anything else in there, so this stays permissive
 * rather than modeling the whole spec.
 */
export interface PackageJsonLike {
  readonly name?: string;
  readonly version?: string;
  readonly scripts?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly packageManager?: string;
  readonly workspaces?: readonly string[] | { readonly packages?: readonly string[] };
  readonly volta?: { readonly node?: string };
  readonly engines?: { readonly node?: string };
  /** Peeked at during detection only for an icon hint; step 4 owns real config validation. */
  readonly launcher?: { readonly icon?: string; readonly port?: number };
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface DevScriptCandidate {
  readonly name: string;
  readonly command: string;
}

export interface FrameworkInfo {
  readonly name: string;
  readonly defaultPort: number;
  /** Matches a dev server's "ready" output; capture group 1 is the port, if present. */
  readonly readyPattern: RegExp;
}

export interface NodeVersionInfo {
  readonly version: string;
  readonly source: 'nvmrc' | 'node-version' | 'volta' | 'engines';
}

export interface WorkspaceApp {
  readonly name: string;
  /** Path relative to the monorepo root. */
  readonly dir: string;
  readonly devScript: string | undefined;
}

export type IconSource =
  | 'configured'
  | 'public/logo.png'
  | 'apple-touch-icon'
  | 'favicon.png'
  | 'app/icon.png';

export interface IconCandidate {
  /** Path relative to the project root. */
  readonly path: string;
  readonly source: IconSource;
}
