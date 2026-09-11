/** One server a run-config importer found, ready to become (or inform) a launcher. */
export interface ImportedLauncher {
  readonly name: string;
  readonly command: string;
  /** Working directory relative to the project root ("." for the root itself). */
  readonly cwd: string;
  readonly port: number | undefined;
}

export interface ImportedRunConfig {
  /** Human-readable origin, shown to the user ("from .claude/launch.json"). */
  readonly source: string;
  readonly launchers: readonly ImportedLauncher[];
}

/**
 * A source of "this tool already knows how to run this project" — imported
 * instead of re-detected from scratch. Add one per tool (VS Code tasks,
 * other agents' preview configs, Procfiles — see LATER.md) without touching
 * the tools that already exist.
 */
export interface RunConfigImporter {
  /** Matches ImportedRunConfig["source"] when this importer finds something. */
  readonly source: string;
  /**
   * Returns undefined if there's nothing to import. Throws a DevlaunchError
   * (RUN_CONFIG_INVALID) if the file exists but can't be understood — the
   * caller decides whether to surface that or fall back to heuristics.
   */
  detect(projectDir: string): ImportedRunConfig | undefined;
}
