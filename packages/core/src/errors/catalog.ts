import type { DevlaunchErrorCode, ErrorCatalogEntry } from './types.js';

/**
 * The one error catalog. Everything that can go wrong for an end user is a key
 * here — dialogs, `--json` output, docs, and the agent skill's error reference
 * are all generated from this object (see `generate.ts`). Add a code here
 * before throwing it anywhere.
 */
export const ERROR_CATALOG: Readonly<Record<DevlaunchErrorCode, ErrorCatalogEntry>> = {
  NODE_NOT_FOUND: {
    code: 'NODE_NOT_FOUND',
    category: 'environment',
    title: "Node.js isn't available",
    explanation:
      "devlaunch couldn't find Node.js when it started your project's login shell. " +
      'This usually means Node is only set up in an interactive terminal session, ' +
      'not in the shell environment apps launch with.',
    actions: ['View Setup Help', 'View Logs', 'Cancel'],
    agentHint:
      'Ask the user whether Node is installed (nvm, fnm, volta, or a system install). ' +
      'If it is, the login shell likely needs one of those tools initialized in ' +
      '~/.zprofile or ~/.zshrc rather than only ~/.zshrc interactive blocks. ' +
      'After a fix, verify with `npx devlaunch doctor --json`.',
    developerDetail:
      'launcher.sh runs as a login shell (`zsh -l`) so nvm/fnm/volta/asdf init scripts ' +
      'load, then checks `command -v node`. This fires when that check fails.',
  },
  NODE_VERSION_MISSING: {
    code: 'NODE_VERSION_MISSING',
    category: 'environment',
    title: 'The required Node.js version is not installed',
    explanation:
      'This project asks for a specific Node.js version that devlaunch could not find ' +
      'on this Mac. Node itself is available, just not the version this project needs.',
    actions: ['View Setup Help', 'Use Current Node Anyway', 'View Logs', 'Cancel'],
    agentHint:
      'Read the requested version from developerDetail. If the user has nvm/fnm/volta, ' +
      'ask them to run the install command for that tool (e.g. `nvm install <version>`) ' +
      'then retry `devlaunch open`. Do not silently fall back to a different version.',
    developerDetail:
      'Resolved the required version from .nvmrc, .node-version, the "volta" field, or ' +
      '"engines.node" in package.json (in that precedence), then checked it against the ' +
      'versions the detected version manager knows about.',
  },
  PROJECT_MOVED: {
    code: 'PROJECT_MOVED',
    category: 'environment',
    title: "This app's project folder can't be found",
    explanation:
      'The project this launcher points to has been moved, renamed, or deleted since ' +
      'the launcher app was created.',
    actions: ['Locate Folder…', 'Remove App', 'Cancel'],
    agentHint:
      'Ask the user where the project now lives, then run `devlaunch init --cwd <new path> ' +
      '--name <existing name>` to regenerate the launcher in place, or `devlaunch uninstall` ' +
      'if the project is gone for good.',
    developerDetail:
      'launcher.sh checks that the project directory recorded in launcher.env still exists ' +
      'before doing anything else.',
  },
  PORT_IN_USE: {
    code: 'PORT_IN_USE',
    category: 'environment',
    title: 'Another app is already using this port',
    explanation:
      'The port this project wants to use is already taken by something else, so the ' +
      'dev server could not start on it.',
    actions: ['Use Another Port', 'Quit Other App', 'Cancel'],
    agentHint:
      'Run `devlaunch doctor --json` to see what is holding the port. Offer to change the ' +
      'configured port (package.json "launcher.port" or .devlaunch.local.json) rather than ' +
      'guessing; only offer to quit the other process if the user confirms it is safe to.',
    developerDetail:
      'Checked with `lsof -i :<port>` before starting the dev server. The second dialog ' +
      'confirmation names the process (command + PID) so the user knows what they are quitting.',
  },
  DEPS_INSTALL_FAILED: {
    code: 'DEPS_INSTALL_FAILED',
    category: 'project-code',
    title: "This project's dependencies failed to install",
    explanation:
      "devlaunch tried to install this project's dependencies before starting it, and the " +
      'install command failed.',
    actions: ['Retry Install', 'View Logs', 'Cancel'],
    agentHint:
      'Run `devlaunch logs --json` and read the install output. Common causes: a broken ' +
      'lockfile, a lifecycle script that fails outside a real network/registry, or a ' +
      'private registry needing auth. Fix the underlying issue in the project, then retry.',
    developerDetail:
      "Ran the detected package manager's install command (npm/pnpm/yarn/bun) with a " +
      'non-interactive flag and captured a non-zero exit code.',
  },
  SERVER_EXITED_EARLY: {
    code: 'SERVER_EXITED_EARLY',
    category: 'project-code',
    title: 'The dev server stopped unexpectedly',
    explanation:
      'The dev server process exited on its own shortly after starting, before it was ' +
      'ready to use.',
    actions: ['View Logs', 'Copy Report', 'Cancel'],
    agentHint:
      'Run `devlaunch logs --json --tail 80` and look at the last lines before the process ' +
      'exited — this is almost always a stack trace or a config error in the project itself. ' +
      'Fix it there; devlaunch is only reporting what the project did.',
    developerDetail:
      'The dev script process exited (or was killed) before the ready-line regex matched ' +
      'and before the configured port ever accepted a connection.',
  },
  READY_TIMEOUT: {
    code: 'READY_TIMEOUT',
    category: 'project-code',
    title: 'The dev server is taking too long to start',
    explanation:
      'The dev server process is still running, but devlaunch never saw it become ready ' +
      'within the time it allows.',
    actions: ['View Logs', 'Copy Report', 'Cancel'],
    agentHint:
      'Check whether the configured port actually matches what the dev server binds to ' +
      "(a common cause), and whether the framework's ready-line format changed. Increase " +
      '"readyTimeoutSeconds" in config only after ruling those out.',
    developerDetail:
      'Neither the framework ready-line regex matched stdout/stderr nor did polling the ' +
      'configured port succeed within readyTimeoutSeconds (default 90s).',
  },
  CONFIG_INVALID: {
    code: 'CONFIG_INVALID',
    category: 'user-action',
    title: "This project's devlaunch configuration isn't valid",
    explanation:
      'devlaunch found a launcher configuration for this project, but one or more values ' +
      "in it don't make sense.",
    actions: ['Open Config', 'View Logs', 'Cancel'],
    agentHint:
      'The specific problem is in developerDetail. Fix the offending field in package.json ' +
      '"launcher" or .devlaunch.local.json, then rerun `devlaunch init --dry-run --json` to ' +
      'confirm it validates before applying anything.',
    developerDetail:
      'Failed schema validation (see schemas/config.schema.json) — for example an unknown ' +
      'field, a port outside 1–65535, an invalid "mode", or a reserved field ("processes" or ' +
      '"env") that is not implemented yet.',
  },
  NAME_COLLISION: {
    code: 'NAME_COLLISION',
    category: 'user-action',
    title: 'Another launcher already uses this name',
    explanation:
      'A different devlaunch app already exists with this name, so this project needs a ' +
      'different one.',
    actions: ['Use Suggested Name', 'Choose Different Name', 'Cancel'],
    agentHint:
      'Prefer the suggested name in developerDetail unless the user has a preference. Pass ' +
      'it with `devlaunch init --name <name>`. This is common with multiple clones or git ' +
      'worktrees of the same repo.',
    developerDetail:
      'The bundle registry at ~/Library/Application Support/devlaunch/ already has an entry ' +
      'for this name pointing at a different project path.',
  },
  PLATFORM_UNSUPPORTED: {
    code: 'PLATFORM_UNSUPPORTED',
    category: 'environment',
    title: 'devlaunch only supports macOS right now',
    explanation:
      'devlaunch generates macOS apps and native dialogs. On any other platform it has ' +
      'nothing to do, so it exits without changing anything.',
    actions: ['OK'],
    agentHint:
      'Do not retry or attempt a workaround. Tell the user devlaunch is macOS-only for now ' +
      'and exit the workflow cleanly.',
    developerDetail:
      'The "unsupported" platform adapter is selected whenever process.platform !== "darwin".',
  },
  SPOTLIGHT_NOT_INDEXING: {
    code: 'SPOTLIGHT_NOT_INDEXING',
    category: 'environment',
    title: "Spotlight hasn't indexed the new app yet",
    explanation:
      "The launcher app was created, but Spotlight hasn't picked it up yet, so typing its " +
      "name won't find it immediately.",
    actions: ['Open Applications Folder', 'View Logs', 'Cancel'],
    agentHint:
      'Run `devlaunch doctor --json` to check indexing status. If it stays stuck, the ' +
      'fallback is opening the app directly with `devlaunch open <name>` or from ' +
      '~/Applications in Finder — mdimport can be slow on some Macs.',
    developerDetail:
      'devlaunch calls `mdimport` on the new bundle after writing it; this fires when the ' +
      'app still does not show up in an `mdfind` lookup afterwards.',
  },
  NO_PACKAGE_JSON: {
    code: 'NO_PACKAGE_JSON',
    category: 'user-action',
    title: "This folder doesn't look like a project devlaunch can run",
    explanation:
      "devlaunch looks for a package.json to detect a project, and didn't find one here.",
    actions: ['Choose Different Folder', 'Cancel'],
    agentHint:
      'Confirm the working directory is the project root (not a subfolder or the repo root ' +
      'of a monorepo without its own package.json). Rerun with `--cwd <path>` pointed at the ' +
      'right directory.',
    developerDetail: 'No package.json found at the resolved project directory.',
  },
  NO_DEV_SCRIPT: {
    code: 'NO_DEV_SCRIPT',
    category: 'user-action',
    title: "devlaunch can't tell how to start this project",
    explanation:
      'devlaunch looks for a script that starts a dev server (like "dev" or "start") in ' +
      'package.json, and none of the usual names were there.',
    actions: ['Open package.json', 'Cancel'],
    agentHint:
      'List the scripts in package.json for the user and ask which one starts the dev ' +
      'server, then pass it explicitly with `devlaunch init --script <name>`.',
    developerDetail:
      'Checked package.json "scripts" for common dev-script names ("dev", "start", ' +
      '"develop", framework-specific names) and found none.',
  },
  RUN_CONFIG_INVALID: {
    code: 'RUN_CONFIG_INVALID',
    category: 'project-code',
    title: "This project's saved run configuration isn't valid",
    explanation:
      'devlaunch found a .claude/launch.json file to import settings from, but could not ' +
      'make sense of its contents.',
    actions: ['View .claude/launch.json', 'Ignore and Detect Normally', 'Cancel'],
    agentHint:
      'Do not edit .claude/launch.json — devlaunch never modifies it. Either fix the format ' +
      '(check current Claude Code docs for "Configure preview servers") or proceed with ' +
      '`devlaunch init` heuristic detection instead.',
    developerDetail:
      'The RunConfigImporter for .claude/launch.json could not parse the file as the ' +
      'documented shape (see the doc-link comment in src/detect/importers/claude-launch-json.ts).',
  },
  DEVLAUNCH_BUG: {
    code: 'DEVLAUNCH_BUG',
    category: 'devlaunch-bug',
    title: 'Something went wrong inside devlaunch',
    explanation:
      "This isn't a problem with your project or your Mac — devlaunch hit a case it " +
      "doesn't handle yet.",
    actions: ['Copy Report', 'Cancel'],
    agentHint:
      'Run `devlaunch report --clipboard` and file it as a GitHub issue on the devlaunch ' +
      'repo with the redacted report attached. Do not attempt to work around it by editing ' +
      "generated files by hand — they're overwritten on the next `init`.",
    developerDetail: 'An unexpected internal error — not one of the other catalog codes.',
  },
};

/** Look up a catalog entry. Throws if `code` isn't registered — that's a devlaunch bug. */
export function getErrorEntry(code: DevlaunchErrorCode): ErrorCatalogEntry {
  const entry = ERROR_CATALOG[code];
  if (!entry) {
    throw new Error(`Unknown error code "${code}" — it has no ERROR_CATALOG entry.`);
  }
  return entry;
}

/** All entries, sorted by code, for generators and tests that iterate the catalog. */
export function listErrorEntries(): readonly ErrorCatalogEntry[] {
  return Object.values(ERROR_CATALOG).sort((a, b) => a.code.localeCompare(b.code));
}
