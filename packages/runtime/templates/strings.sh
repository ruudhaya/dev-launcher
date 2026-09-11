# GENERATED FILE. Do not edit by hand — edit packages/core/src/errors/catalog.ts and run `pnpm --filter @devlaunch/core generate`.
#
# One block per devlaunch error code. Sourced by launcher.sh; never edited there.

# CONFIG_INVALID (user-action)
DEVLAUNCH_ERROR_CONFIG_INVALID_TITLE="This project's devlaunch configuration isn't valid"
DEVLAUNCH_ERROR_CONFIG_INVALID_EXPLANATION="devlaunch found a launcher configuration for this project, but one or more values in it don't make sense."
DEVLAUNCH_ERROR_CONFIG_INVALID_ACTIONS="Open Config|View Logs|Cancel"
DEVLAUNCH_ERROR_CONFIG_INVALID_AGENT_HINT="The specific problem is in developerDetail. Fix the offending field in package.json \"launcher\" or .devlaunch.local.json, then rerun \`devlaunch init --dry-run --json\` to confirm it validates before applying anything."

# DEPS_INSTALL_FAILED (project-code)
DEVLAUNCH_ERROR_DEPS_INSTALL_FAILED_TITLE="This project's dependencies failed to install"
DEVLAUNCH_ERROR_DEPS_INSTALL_FAILED_EXPLANATION="devlaunch tried to install this project's dependencies before starting it, and the install command failed."
DEVLAUNCH_ERROR_DEPS_INSTALL_FAILED_ACTIONS="Retry Install|View Logs|Cancel"
DEVLAUNCH_ERROR_DEPS_INSTALL_FAILED_AGENT_HINT="Run \`devlaunch logs --json\` and read the install output. Common causes: a broken lockfile, a lifecycle script that fails outside a real network/registry, or a private registry needing auth. Fix the underlying issue in the project, then retry."

# DEVLAUNCH_BUG (devlaunch-bug)
DEVLAUNCH_ERROR_DEVLAUNCH_BUG_TITLE="Something went wrong inside devlaunch"
DEVLAUNCH_ERROR_DEVLAUNCH_BUG_EXPLANATION="This isn't a problem with your project or your Mac — devlaunch hit a case it doesn't handle yet."
DEVLAUNCH_ERROR_DEVLAUNCH_BUG_ACTIONS="Copy Report|Cancel"
DEVLAUNCH_ERROR_DEVLAUNCH_BUG_AGENT_HINT="Run \`devlaunch report --clipboard\` and file it as a GitHub issue on the devlaunch repo with the redacted report attached. Do not attempt to work around it by editing generated files by hand — they're overwritten on the next \`init\`."

# NAME_COLLISION (user-action)
DEVLAUNCH_ERROR_NAME_COLLISION_TITLE="Another launcher already uses this name"
DEVLAUNCH_ERROR_NAME_COLLISION_EXPLANATION="A different devlaunch app already exists with this name, so this project needs a different one."
DEVLAUNCH_ERROR_NAME_COLLISION_ACTIONS="Use Suggested Name|Choose Different Name|Cancel"
DEVLAUNCH_ERROR_NAME_COLLISION_AGENT_HINT="Prefer the suggested name in developerDetail unless the user has a preference. Pass it with \`devlaunch init --name <name>\`. This is common with multiple clones or git worktrees of the same repo."

# NO_DEV_SCRIPT (user-action)
DEVLAUNCH_ERROR_NO_DEV_SCRIPT_TITLE="devlaunch can't tell how to start this project"
DEVLAUNCH_ERROR_NO_DEV_SCRIPT_EXPLANATION="devlaunch looks for a script that starts a dev server (like \"dev\" or \"start\") in package.json, and none of the usual names were there."
DEVLAUNCH_ERROR_NO_DEV_SCRIPT_ACTIONS="Open package.json|Cancel"
DEVLAUNCH_ERROR_NO_DEV_SCRIPT_AGENT_HINT="List the scripts in package.json for the user and ask which one starts the dev server, then pass it explicitly with \`devlaunch init --script <name>\`."

# NO_PACKAGE_JSON (user-action)
DEVLAUNCH_ERROR_NO_PACKAGE_JSON_TITLE="This folder doesn't look like a project devlaunch can run"
DEVLAUNCH_ERROR_NO_PACKAGE_JSON_EXPLANATION="devlaunch looks for a package.json to detect a project, and didn't find one here."
DEVLAUNCH_ERROR_NO_PACKAGE_JSON_ACTIONS="Choose Different Folder|Cancel"
DEVLAUNCH_ERROR_NO_PACKAGE_JSON_AGENT_HINT="Confirm the working directory is the project root (not a subfolder or the repo root of a monorepo without its own package.json). Rerun with \`--cwd <path>\` pointed at the right directory."

# NODE_NOT_FOUND (environment)
DEVLAUNCH_ERROR_NODE_NOT_FOUND_TITLE="Node.js isn't available"
DEVLAUNCH_ERROR_NODE_NOT_FOUND_EXPLANATION="devlaunch couldn't find Node.js when it started your project's login shell. This usually means Node is only set up in an interactive terminal session, not in the shell environment apps launch with."
DEVLAUNCH_ERROR_NODE_NOT_FOUND_ACTIONS="View Setup Help|View Logs|Cancel"
DEVLAUNCH_ERROR_NODE_NOT_FOUND_AGENT_HINT="Ask the user whether Node is installed (nvm, fnm, volta, or a system install). If it is, the login shell likely needs one of those tools initialized in ~/.zprofile or ~/.zshrc rather than only ~/.zshrc interactive blocks. After a fix, verify with \`npx devlaunch doctor --json\`."

# NODE_VERSION_MISSING (environment)
DEVLAUNCH_ERROR_NODE_VERSION_MISSING_TITLE="The required Node.js version is not installed"
DEVLAUNCH_ERROR_NODE_VERSION_MISSING_EXPLANATION="This project asks for a specific Node.js version that devlaunch could not find on this Mac. Node itself is available, just not the version this project needs."
DEVLAUNCH_ERROR_NODE_VERSION_MISSING_ACTIONS="View Setup Help|Use Current Node Anyway|View Logs|Cancel"
DEVLAUNCH_ERROR_NODE_VERSION_MISSING_AGENT_HINT="Read the requested version from developerDetail. If the user has nvm/fnm/volta, ask them to run the install command for that tool (e.g. \`nvm install <version>\`) then retry \`devlaunch open\`. Do not silently fall back to a different version."

# PLATFORM_UNSUPPORTED (environment)
DEVLAUNCH_ERROR_PLATFORM_UNSUPPORTED_TITLE="devlaunch only supports macOS right now"
DEVLAUNCH_ERROR_PLATFORM_UNSUPPORTED_EXPLANATION="devlaunch generates macOS apps and native dialogs. On any other platform it has nothing to do, so it exits without changing anything."
DEVLAUNCH_ERROR_PLATFORM_UNSUPPORTED_ACTIONS="OK"
DEVLAUNCH_ERROR_PLATFORM_UNSUPPORTED_AGENT_HINT="Do not retry or attempt a workaround. Tell the user devlaunch is macOS-only for now and exit the workflow cleanly."

# PORT_IN_USE (environment)
DEVLAUNCH_ERROR_PORT_IN_USE_TITLE="Another app is already using this port"
DEVLAUNCH_ERROR_PORT_IN_USE_EXPLANATION="The port this project wants to use is already taken by something else, so the dev server could not start on it."
DEVLAUNCH_ERROR_PORT_IN_USE_ACTIONS="Use Another Port|Quit Other App|Cancel"
DEVLAUNCH_ERROR_PORT_IN_USE_AGENT_HINT="Run \`devlaunch doctor --json\` to see what is holding the port. Offer to change the configured port (package.json \"launcher.port\" or .devlaunch.local.json) rather than guessing; only offer to quit the other process if the user confirms it is safe to."

# PROJECT_MOVED (environment)
DEVLAUNCH_ERROR_PROJECT_MOVED_TITLE="This app's project folder can't be found"
DEVLAUNCH_ERROR_PROJECT_MOVED_EXPLANATION="The project this launcher points to has been moved, renamed, or deleted since the launcher app was created."
DEVLAUNCH_ERROR_PROJECT_MOVED_ACTIONS="Locate Folder…|Remove App|Cancel"
DEVLAUNCH_ERROR_PROJECT_MOVED_AGENT_HINT="Ask the user where the project now lives, then run \`devlaunch init --cwd <new path> --name <existing name>\` to regenerate the launcher in place, or \`devlaunch uninstall\` if the project is gone for good."

# READY_TIMEOUT (project-code)
DEVLAUNCH_ERROR_READY_TIMEOUT_TITLE="The dev server is taking too long to start"
DEVLAUNCH_ERROR_READY_TIMEOUT_EXPLANATION="The dev server process is still running, but devlaunch never saw it become ready within the time it allows."
DEVLAUNCH_ERROR_READY_TIMEOUT_ACTIONS="View Logs|Copy Report|Cancel"
DEVLAUNCH_ERROR_READY_TIMEOUT_AGENT_HINT="Check whether the configured port actually matches what the dev server binds to (a common cause), and whether the framework's ready-line format changed. Increase \"readyTimeoutSeconds\" in config only after ruling those out."

# RUN_CONFIG_INVALID (project-code)
DEVLAUNCH_ERROR_RUN_CONFIG_INVALID_TITLE="This project's saved run configuration isn't valid"
DEVLAUNCH_ERROR_RUN_CONFIG_INVALID_EXPLANATION="devlaunch found a .claude/launch.json file to import settings from, but could not make sense of its contents."
DEVLAUNCH_ERROR_RUN_CONFIG_INVALID_ACTIONS="View .claude/launch.json|Ignore and Detect Normally|Cancel"
DEVLAUNCH_ERROR_RUN_CONFIG_INVALID_AGENT_HINT="Do not edit .claude/launch.json — devlaunch never modifies it. Either fix the format (check current Claude Code docs for \"Configure preview servers\") or proceed with \`devlaunch init\` heuristic detection instead."

# SERVER_EXITED_EARLY (project-code)
DEVLAUNCH_ERROR_SERVER_EXITED_EARLY_TITLE="The dev server stopped unexpectedly"
DEVLAUNCH_ERROR_SERVER_EXITED_EARLY_EXPLANATION="The dev server process exited on its own shortly after starting, before it was ready to use."
DEVLAUNCH_ERROR_SERVER_EXITED_EARLY_ACTIONS="View Logs|Copy Report|Cancel"
DEVLAUNCH_ERROR_SERVER_EXITED_EARLY_AGENT_HINT="Run \`devlaunch logs --json --tail 80\` and look at the last lines before the process exited — this is almost always a stack trace or a config error in the project itself. Fix it there; devlaunch is only reporting what the project did."

# SPOTLIGHT_NOT_INDEXING (environment)
DEVLAUNCH_ERROR_SPOTLIGHT_NOT_INDEXING_TITLE="Spotlight hasn't indexed the new app yet"
DEVLAUNCH_ERROR_SPOTLIGHT_NOT_INDEXING_EXPLANATION="The launcher app was created, but Spotlight hasn't picked it up yet, so typing its name won't find it immediately."
DEVLAUNCH_ERROR_SPOTLIGHT_NOT_INDEXING_ACTIONS="Open Applications Folder|View Logs|Cancel"
DEVLAUNCH_ERROR_SPOTLIGHT_NOT_INDEXING_AGENT_HINT="Run \`devlaunch doctor --json\` to check indexing status. If it stays stuck, the fallback is opening the app directly with \`devlaunch open <name>\` or from ~/Applications in Finder — mdimport can be slow on some Macs."
