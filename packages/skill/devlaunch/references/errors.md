<!-- GENERATED FILE. Do not edit by hand — edit packages/core/src/errors/catalog.ts and run `pnpm --filter @devlaunch/core generate`. -->

Every failure devlaunch can report has a stable code. If you hit one that
isn't listed here, that's itself a bug — please file it.

## CONFIG_INVALID

**Category:** user-action

**This project's devlaunch configuration isn't valid**

devlaunch found a launcher configuration for this project, but one or more values in it don't make sense.

**Dialog actions:**

- Open Config
- View Logs
- Cancel

**For coding agents:**

The specific problem is in developerDetail. Fix the offending field in package.json "launcher" or .devlaunch.local.json, then rerun `devlaunch init --dry-run --json` to confirm it validates before applying anything.

**Developer detail:**

Failed schema validation (see schemas/config.schema.json) — for example an unknown field, a port outside 1–65535, an invalid "mode", or a reserved field ("processes" or "env") that is not implemented yet.

## DEPS_INSTALL_FAILED

**Category:** project-code

**This project's dependencies failed to install**

devlaunch tried to install this project's dependencies before starting it, and the install command failed.

**Dialog actions:**

- Retry Install
- View Logs
- Cancel

**For coding agents:**

Run `devlaunch logs --json` and read the install output. Common causes: a broken lockfile, a lifecycle script that fails outside a real network/registry, or a private registry needing auth. Fix the underlying issue in the project, then retry.

**Developer detail:**

Ran the detected package manager's install command (npm/pnpm/yarn/bun) with a non-interactive flag and captured a non-zero exit code.

## DEVLAUNCH_BUG

**Category:** devlaunch-bug

**Something went wrong inside devlaunch**

This isn't a problem with your project or your Mac — devlaunch hit a case it doesn't handle yet.

**Dialog actions:**

- Copy Report
- Cancel

**For coding agents:**

Run `devlaunch report --clipboard` and file it as a GitHub issue on the devlaunch repo with the redacted report attached. Do not attempt to work around it by editing generated files by hand — they're overwritten on the next `init`.

**Developer detail:**

An unexpected internal error — not one of the other catalog codes.

## LAUNCHER_NOT_FOUND

**Category:** user-action

**Can't find a launcher with that name**

devlaunch doesn't have a launcher registered with this name. Check the spelling, or see what is registered.

**Dialog actions:**

- View List
- Cancel

**For coding agents:**

Run `devlaunch list --json` to see the exact registered names, then retry with the correct one. If run from inside the project's own directory, omitting the name also works — devlaunch matches it by project path.

**Developer detail:**

No entry for this name in the bundle registry at ~/Library/Application Support/devlaunch/registry.json.

## NAME_COLLISION

**Category:** user-action

**Another launcher already uses this name**

A different devlaunch app already exists with this name, so this project needs a different one.

**Dialog actions:**

- Use Suggested Name
- Choose Different Name
- Cancel

**For coding agents:**

Prefer the suggested name in developerDetail unless the user has a preference. Pass it with `devlaunch init --name <name>`. This is common with multiple clones or git worktrees of the same repo.

**Developer detail:**

The bundle registry at ~/Library/Application Support/devlaunch/ already has an entry for this name pointing at a different project path.

## NO_DEV_SCRIPT

**Category:** user-action

**devlaunch can't tell how to start this project**

devlaunch looks for a script that starts a dev server (like "dev" or "start") in package.json, and none of the usual names were there.

**Dialog actions:**

- Open package.json
- Cancel

**For coding agents:**

List the scripts in package.json for the user and ask which one starts the dev server, then pass it explicitly with `devlaunch init --script <name>`.

**Developer detail:**

Checked package.json "scripts" for common dev-script names ("dev", "start", "develop", framework-specific names) and found none.

## NO_PACKAGE_JSON

**Category:** user-action

**This folder doesn't look like a project devlaunch can run**

devlaunch looks for a package.json to detect a project, and didn't find one here.

**Dialog actions:**

- Choose Different Folder
- Cancel

**For coding agents:**

Confirm the working directory is the project root (not a subfolder or the repo root of a monorepo without its own package.json). Rerun with `--cwd <path>` pointed at the right directory.

**Developer detail:**

No package.json found at the resolved project directory.

## NODE_NOT_FOUND

**Category:** environment

**Node.js isn't available**

devlaunch couldn't find Node.js when it started your project's login shell. This usually means Node is only set up in an interactive terminal session, not in the shell environment apps launch with.

**Dialog actions:**

- View Setup Help
- View Logs
- Cancel

**For coding agents:**

Ask the user whether Node is installed (nvm, fnm, volta, or a system install). If it is, the login shell likely needs one of those tools initialized in ~/.zprofile or ~/.zshrc rather than only ~/.zshrc interactive blocks. After a fix, verify with `npx devlaunch doctor --json`.

**Developer detail:**

launcher.sh runs as a login shell (`zsh -l`) so nvm/fnm/volta/asdf init scripts load, then checks `command -v node`. This fires when that check fails.

## NODE_VERSION_MISSING

**Category:** environment

**The required Node.js version is not installed**

This project asks for a specific Node.js version that devlaunch could not find on this Mac. Node itself is available, just not the version this project needs.

**Dialog actions:**

- View Setup Help
- Use Current Node Anyway
- View Logs
- Cancel

**For coding agents:**

Read the requested version from developerDetail. If the user has nvm/fnm/volta, ask them to run the install command for that tool (e.g. `nvm install <version>`) then retry `devlaunch open`. Do not silently fall back to a different version.

**Developer detail:**

Resolved the required version from .nvmrc, .node-version, the "volta" field, or "engines.node" in package.json (in that precedence), then checked it against the versions the detected version manager knows about.

## PLATFORM_UNSUPPORTED

**Category:** environment

**devlaunch only supports macOS right now**

devlaunch generates macOS apps and native dialogs. On any other platform it has nothing to do, so it exits without changing anything.

**Dialog actions:**

- OK

**For coding agents:**

Do not retry or attempt a workaround. Tell the user devlaunch is macOS-only for now and exit the workflow cleanly.

**Developer detail:**

The "unsupported" platform adapter is selected whenever process.platform !== "darwin".

## PORT_IN_USE

**Category:** environment

**Another app is already using this port**

The port this project wants to use is already taken by something else, so the dev server could not start on it.

**Dialog actions:**

- Use Another Port
- Quit Other App
- Cancel

**For coding agents:**

Run `devlaunch doctor --json` to see what is holding the port. Offer to change the configured port (package.json "launcher.port" or .devlaunch.local.json) rather than guessing; only offer to quit the other process if the user confirms it is safe to.

**Developer detail:**

Checked with `lsof -i :<port>` before starting the dev server. The second dialog confirmation names the process (command + PID) so the user knows what they are quitting.

## PROJECT_MOVED

**Category:** environment

**This app's project folder can't be found**

The project this launcher points to has been moved, renamed, or deleted since the launcher app was created.

**Dialog actions:**

- Locate Folder…
- Remove App
- Cancel

**For coding agents:**

Ask the user where the project now lives, then run `devlaunch init --cwd <new path> --name <existing name>` to regenerate the launcher in place, or `devlaunch uninstall` if the project is gone for good.

**Developer detail:**

launcher.sh checks that the project directory recorded in launcher.env still exists before doing anything else.

## READY_TIMEOUT

**Category:** project-code

**The dev server is taking too long to start**

The dev server process is still running, but devlaunch never saw it become ready within the time it allows.

**Dialog actions:**

- View Logs
- Copy Report
- Cancel

**For coding agents:**

Check whether the configured port actually matches what the dev server binds to (a common cause), and whether the framework's ready-line format changed. Increase "readyTimeoutSeconds" in config only after ruling those out.

**Developer detail:**

Neither the framework ready-line regex matched stdout/stderr nor did polling the configured port succeed within readyTimeoutSeconds (default 90s).

## RUN_CONFIG_INVALID

**Category:** project-code

**This project's saved run configuration isn't valid**

devlaunch found a .claude/launch.json file to import settings from, but could not make sense of its contents.

**Dialog actions:**

- View .claude/launch.json
- Ignore and Detect Normally
- Cancel

**For coding agents:**

Do not edit .claude/launch.json — devlaunch never modifies it. Either fix the format (check current Claude Code docs for "Configure preview servers") or proceed with `devlaunch init` heuristic detection instead.

**Developer detail:**

The RunConfigImporter for .claude/launch.json could not parse the file as the documented shape (see the doc-link comment in src/detect/importers/claude-launch-json.ts).

## SERVER_EXITED_EARLY

**Category:** project-code

**The dev server stopped unexpectedly**

The dev server process exited on its own shortly after starting, before it was ready to use.

**Dialog actions:**

- View Logs
- Copy Report
- Cancel

**For coding agents:**

Run `devlaunch logs --json --tail 80` and look at the last lines before the process exited — this is almost always a stack trace or a config error in the project itself. Fix it there; devlaunch is only reporting what the project did.

**Developer detail:**

The dev script process exited (or was killed) before the ready-line regex matched and before the configured port ever accepted a connection.

## SPOTLIGHT_NOT_INDEXING

**Category:** environment

**Spotlight hasn't indexed the new app yet**

The launcher app was created, but Spotlight hasn't picked it up yet, so typing its name won't find it immediately.

**Dialog actions:**

- Open Applications Folder
- View Logs
- Cancel

**For coding agents:**

Run `devlaunch doctor --json` to check indexing status. If it stays stuck, the fallback is opening the app directly with `devlaunch open <name>` or from ~/Applications in Finder — mdimport can be slow on some Macs.

**Developer detail:**

devlaunch calls `mdimport` on the new bundle after writing it; this fires when the app still does not show up in an `mdfind` lookup afterwards.
