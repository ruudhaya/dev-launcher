# devlaunch: Claude Code prompt pack (v3, two launches)

This pack replaces v1 and v2. It is organised around two launches so the project ships early and keeps shipping:

- **Launch 1: developers and their teams.** The engine, an agent-ready CLI, team onboarding, and a developer-pitched Agent Skill. Launched to developer communities.
- **Launch 2: AI builders.** Plain-language dialogs, "Ask AI to fix this", Keychain secrets with a setup assistant, a skill tuned for non-developers, and a landing page for them. Launched a few weeks after Launch 1, on top of a product people already use.

Prompt 1 (monorepo setup) is done. Start with L1-0.

**v3.1 additions:** L1-1 imports Claude Code's `.claude/launch.json` as a detection source; L1-6 adds a competitive analysis and a prepared answer to "why not cmdbar?"; L1-7 adds prepared answers for launch-day questions and a competitor watch; L2-4 updates the competitive view for AI builders; the menu bar app in LATER.md is flagged as crowded territory.

## Map

| Prompt | Milestone | Done when |
|---|---|---|
| 1 | Setup | Done |
| L1-0 Realign the repo | Setup | CLAUDE.md reflects the two-launch plan; LATER.md exists |
| L1-1 Core engine | M1: works on my Mac | Detection, config, catalog, bundle plan all tested |
| L1-2 Launcher runtime | M1 | A generated app starts, opens, and stops a real project |
| L1-3 CLI | M1 | You launch three real projects from Spotlight daily |
| L1-4 Team onboarding | M2: team- and agent-ready | A teammate onboards with one command or a double-click |
| L1-5 Agent Skill (developer) | M2 | Claude Code + one other agent pass the manual checklist |
| L1-6 Release, README, site | M3: a stranger can do it | 0.1.0 on npm; 3 people succeed without your help |
| L1-7 Launch kit | M4: launch | Posted; feedback triaged for a week |
| L2-1 Plain language + fix loop | Launch 2 | Every dialog readable by a non-developer |
| L2-2 Secrets + setup assistant | Launch 2 | API-key apps work with zero terminal use |
| L2-3 Skill for AI builders + evals | Launch 2 | Eval pass rates meet the launch gate |
| L2-4 Messaging + landing page | Launch 2 | Site leads with the paste-this-sentence CTA |
| L2-5 Launch 2 kit | Launch 2 | Posted in AI-builder communities |

Everything else lives in `LATER.md` until real feedback promotes it.

## Rules for every session

1. Fix the launch date; flex the scope. When behind, move items to LATER.md rather than moving the date.
2. Every session ends with working, committed code and an updated **Status** section in CLAUDE.md.
3. New ideas go to LATER.md, never into the current prompt.
4. Use devlaunch on your own projects from the end of M1 onwards.

Two reusable snippets:

**Session start** (when resuming work):
````
Read CLAUDE.md (especially Status) and LATER.md. Continue the current prompt from
where Status says we stopped. Do not build anything listed under "Do not build yet"
in the current prompt or anything in LATER.md. Start by telling me what's done and
what you'll do next.
````

**Session end** (before closing any session):
````
Before we stop: make sure everything builds and tests pass, commit, then update the
Status section in CLAUDE.md with what's done, what's next, and any open questions.
Add any new ideas we discussed to LATER.md.
````

---

# Launch 1: developers and their teams

## L1-0: Realign the repo

````
Read CLAUDE.md first. This session updates project context and structure for the
plan we've settled on. No product logic.

## Product context (rewrite the product section of CLAUDE.md)

devlaunch turns any local web project into a macOS app that opens from Spotlight,
starts the dev server, and opens the browser once the app is ready.

The product ships in two launches:
- Launch 1 (current): developers and the non-developers they work with (designers,
  PMs, QA). Pitch: stop opening an IDE and terminal just to run your app, and give
  your teammates a one-click way to run it. The CLI is agent-ready from day one
  (JSON output, exit codes, error catalog) and ships with an Agent Skill so coding
  agents can set it up.
- Launch 2 (next): people who build web apps with AI agents and aren't developers.
  Adds plain-language dialogs, "Ask AI to fix this", Keychain secrets with a
  setup assistant, and a skill tuned for them.

## Principles (replace the principles section)

1. Agent-ready contract: every command supports `--json`, non-interactive use,
   `--dry-run` where it changes anything, and stable exit codes.
2. One error catalog in packages/core feeds dialogs, CLI output, docs, and the
   skill. Generated files are never edited by hand.
3. No postinstall hooks. Non-macOS platforms exit cleanly with a friendly message.
4. Every change devlaunch makes has an undo command.
5. Reports and logs shown to users are redacted of secret values. devlaunch never
   stores secret values in Launch 1; projects keep using their own `.env`.
6. Nothing is exposed to the network by default.
7. Core is platform-neutral; macOS specifics sit behind a platform adapter.
8. All user-facing strings live in one place, so Launch 2 can rewrite them in
   plain language without touching logic.

## Add these files

- CLAUDE.md sections: "Launches and milestones" (the table below), "Status"
  (current prompt, done, next, open questions), and "Scope rule: do not build
  anything in LATER.md unless a prompt explicitly promotes it."
- LATER.md, seeded with: Keychain secrets and setup assistant (Launch 2), plain-
  language rewrite (Launch 2), automated agent evals (Launch 2), multi-process
  launchers (frontend + API in one app), SVG/initials icon generation, managed Node
  and Python runtimes, Python backends, open-on-my-phone sharing, menu bar app
  (crowded territory: cmdbar, Harbr, DevDock and others exist; only build it if
  users ask, and make it clearly different), Windows support, "put it online"
  handoff, importers for other tools' run configs (e.g. VS Code tasks).
- docs/roadmap.md with the two launches and the LATER items.
- docs/decisions/0001-two-launches.md: short ADR explaining developer-first, the
  agent-ready contract as the bridge to Launch 2, and what was deferred and why.

Milestones table for CLAUDE.md:
- M1 works on my Mac (L1-1 core, L1-2 runtime, L1-3 CLI)
- M2 team- and agent-ready (L1-4 team onboarding, L1-5 skill)
- M3 a stranger can do it (L1-6 release, README, site)
- M4 launch (L1-7)
- Launch 2 (L2-1 to L2-5)

## Examples

Keep existing fixtures. Add examples/broken/ with small fixtures that each fail one
way: missing-dependency, crash-on-start, wrong-port-config, node-version-mismatch
(requests a Node version unlikely to be installed). These drive error-path tests.

Plan first (show the CLAUDE.md diff), then implement, verify build/lint/test pass,
and fill in Status.
````

---

## L1-1: Core engine (Milestone 1)

````
Read CLAUDE.md first. Build packages/core for Launch 1. No CLI commands or shell
runtime yet. Testable without a Mac except the macOS adapter.

## Build, in this order

1. Error catalog (src/errors/). Each entry: `code` (stable, e.g. NODE_NOT_FOUND,
   NODE_VERSION_MISSING, PROJECT_MOVED, PORT_IN_USE, DEPS_INSTALL_FAILED,
   SERVER_EXITED_EARLY, READY_TIMEOUT, CONFIG_INVALID, NAME_COLLISION,
   PLATFORM_UNSUPPORTED, SPOTLIGHT_NOT_INDEXING, plus any you need), `category`
   (user-action | environment | project-code | devlaunch-bug), `title`,
   `explanation` (clear and jargon-light), `actions` (dialog buttons), `agentHint`
   (what a coding agent should do), `developerDetail`. Generators produce: a shell
   strings file for packages/runtime, a Markdown error reference for docs, and
   packages/skill/devlaunch/references/errors.md. Tests: unique codes, complete
   fields.
2. Redaction (src/redact/): redact values of keys found in the project's `.env`
   files (read in memory only, never stored) plus common secret patterns (sk-,
   ghp_, AKIA, xox*-, JWTs, Bearer tokens, password=). Test false positives too.
3. Detection (src/detect/): package manager (lockfile, `packageManager` field),
   dev script candidates, framework with default port and ready-line regex (vite,
   next, react-scripts, remix, astro, nuxt, sveltekit, plus a generic localhost
   fallback), Node version and source (.nvmrc, .node-version, volta, engines),
   workspace apps with dev scripts, icon candidates (configured, public/logo.png,
   apple-touch-icon, favicon.png, app/icon.png).
   Import existing run configs: if the project has `.claude/launch.json` (created
   by the Claude Code desktop app for its preview servers), read it as a detection
   source. First check Claude Code's current docs ("Configure preview servers") for
   the exact format and record the doc link and date checked in a code comment.
   Map its command, working directory, and port onto our fields; if it defines
   several servers, propose one launcher per server (multi-process is deferred) and
   let the CLI ask which. Precedence: our `launcher` config > imported run config >
   heuristics. Never modify launch.json. Implement this behind a small
   `RunConfigImporter` interface so other tools' configs can be added later, and
   report the source ("from .claude/launch.json") in the detection result so the
   CLI can show it. Add a fixture: examples/with-claude-launch-json/.
4. Config (src/config/): defaults < package.json `launcher` < .devlaunch.local.json
   < flags. Fields: name, script, port, mode ("terminal" | "headless", default
   terminal), icon, openPath, browser, readyTimeoutSeconds (default 90). Accept an
   array for monorepos (one launcher per app). Export a JSON Schema to schemas/.
   Design `processes` and `env` as reserved optional fields for later, but reject
   them with a clear message for now.
5. Report builder (src/report/): first line `devlaunch report v1`; summary; error
   code and agentHint; steps attempted; environment (macOS, arch, Node + source,
   package manager, devlaunch version); config; last 80 log lines, redacted;
   closing line telling an agent to run `npx devlaunch doctor --json`. Cap ~12k
   characters. Snapshot tests per broken fixture.
6. Platform adapter (src/platform/): interface for bundle location, write bundle,
   register with Spotlight, dialog, notification, open URL, reveal logs. `macos`
   implementation behind a mockable command runner; `unsupported` implementation.
7. Bundle plan (src/bundle/): pure plan, then writeBundle. Layout:
   Info.plist (bundle id dev.devlaunch.<slug>, DevlaunchVersion, LSUIElement for
   headless), MacOS/launcher, Resources/launcher.env, Resources/devlaunch.mjs
   (vendored CLI so the launcher can build reports offline), Resources/icon.icns.
   Collisions return NAME_COLLISION with a suggested suffix. Same project path
   replaces in place. Registry at ~/Library/Application Support/devlaunch/.
8. Icon: PNG to icns via sips + iconutil; otherwise ship one default icon.

## Do not build yet
Keychain or any secret storage, setup assistant, multi-process launchers, Python
detection, SVG/initials icon generation, managed runtimes.

## Done when
All tests and typecheck pass; generators produce their three outputs; Status is
updated. Plan first, then build in the order above with a commit per step.
````

---

## L1-2: Launcher runtime (Milestone 1)

````
Read CLAUDE.md first. Build packages/runtime: the zsh script inside each app
bundle. Readable, split into functions, all user-facing strings from the generated
strings file.

## Behaviour

1. Login shell so nvm/fnm/volta/asdf load; activate the requested Node version.
   Missing Node → NODE_NOT_FOUND dialog; missing version → NODE_VERSION_MISSING.
2. Project folder gone → PROJECT_MOVED: [Locate Folder…] [Remove App] [Cancel].
3. Single instance via PID file in ~/Library/Application Support/devlaunch/run/.
   Already running → quick menu [Open] [Restart] [Stop]. Clean stale PID files.
4. Dependencies: install if node_modules is missing or the lockfile hash changed
   since the last successful install. Notify while installing.
5. Port taken by something else → PORT_IN_USE: [Use Another Port] [Quit Other
   App] [Cancel], with a second confirmation naming the process.
6. Start: terminal mode opens a Terminal window via osascript, output tee'd to the
   log; headless mode runs in the background. Logs at
   ~/Library/Logs/devlaunch/<slug>.log, rotated at 5 MB, keep 3.
7. Ready detection from the ready-line regex, falling back to polling the port.
   Then open the browser and notify "Ready at <url>". Timeout or early exit →
   catalog dialog with [View Logs] [Copy Report] [Cancel]. Copy Report runs the
   vendored `devlaunch.mjs report --clipboard`; if Node is unavailable, a minimal
   shell report with the same marker line and redacted log tail.
8. Stop: quick menu or closing the Terminal window stops the server and cleans up.

## Tests
bats-core with fake osascript, lsof, open, pbcopy, and package managers on PATH;
assert dialogs, commands, and that redaction holds in copied reports. ShellCheck
clean. scripts/smoke-macos.sh (in the macOS CI job): generate bundles for the
examples into a temp HOME, launch headless, wait for ready, curl, stop, assert
cleanup; run each broken fixture and assert its error code.

## Do not build yet
Secrets handling, setup assistant, multi-process, "Ask AI to fix this" wording
(that's Launch 2; "Copy Report" is the Launch 1 version).

## Done when
Smoke script passes locally and in CI; Status updated.
````

---

## L1-3: CLI (Milestone 1)

````
Read CLAUDE.md first. Build packages/cli, the published `devlaunch` binary. Serve
developers at a terminal and coding agents equally well.

## Contract (write docs/agent-contract.md first)
- `--json` everywhere, envelope with a JSON Schema in schemas/:
  { schemaVersion: 1, ok, code, message, hint, data }.
- Exit codes: 0 ok, 1 unexpected, 2 usage, 3 needs the user, 4 environment,
  5 unsupported.
- Non-TTY or `--yes`: never prompt. `--dry-run` returns the full plan for
  anything that changes the machine or repo.

## Commands
- `init [--cwd] [--yes] [--dry-run] [--name] [--mode]`: detection summary, prompts
  with defaults, write bundle, mdimport, "Press ⌘ Space and type <name>", then
  "Try it now?". Monorepos: choose which apps get launchers.
- `open [name]`, `status [name]`, `list`, `stop [name|--all]`,
  `logs [name] [--tail N]` (redacted), `report [name] [--clipboard]`.
- `doctor [--cwd] [--json]`: macOS version, Node under login vs current shell,
  requested Node version, Spotlight indexing of ~/Applications, config validity,
  port, stale launchers and PID files; each with a catalog code and fix hint.
- `uninstall [name|--all]`.
Single-file dist with no runtime dependencies. NO_COLOR, clear errors (what, why,
what next), --help with examples, no telemetry.

## Tests
Unit and contract tests (every JSON output validates against the schema). macOS
e2e: init --yes on each example into a temp HOME, open, status, stop, uninstall,
assert nothing left behind; broken fixtures return the right codes and exit codes.

## Do not build yet
--team, eject, upgrade, skill commands, secrets commands.

## Done when
Tests pass, and you have used `devlaunch init` on three of your own real projects
and opened them from Spotlight. This completes Milestone 1: update Status and
list anything that annoyed you during daily use.
````

---

## L1-4: Team onboarding (Milestone 2)

````
Read CLAUDE.md first. Add the team features that make Launch 1's pitch stronger
than "why not just use an alias?".

- `init --team`: add the launcher config to package.json, pin devlaunch as a
  devDependency, add a `"launcher": "devlaunch init"` script, gitignore
  .devlaunch.local.json, create a double-clickable `Install Launcher.command` at
  the repo root (runs `npx devlaunch init --yes`, then shows a "Done — find it in
  Spotlight" dialog), and print a README snippet with a "Launch from Spotlight"
  badge. Show the diff and confirm; `--dry-run --json` returns it.
- Existing config means zero prompts for teammates.
- `eject`: reverse every --team change, with diff and confirm.
- `upgrade`: regenerate launchers built by older versions (via DevlaunchVersion).
- Name collisions across clones/worktrees handled with the suggested suffix.
- `.command` file must work from a fresh `git clone` and not trigger quarantine
  warnings; document what happens if it's downloaded as a zip instead.

Tests: snapshot the --team changes for each example; e2e for eject leaving the
repo exactly as before.

Do not build yet: skill commands (next prompt), anything in LATER.md.
Done when: a teammate (or you on a second user account) onboards with one command,
and a non-developer onboards by double-clicking. Update Status.
````

---

## L1-5: Agent Skill, developer edition (Milestone 2)

````
Read CLAUDE.md and docs/agent-contract.md first. Write the Agent Skill and the
command that installs it. Check agentskills.io for the current specification.

## Skill (packages/skill/devlaunch/)
- SKILL.md with a description that triggers on: making a project launchable from
  Spotlight, running the dev server without the terminal/IDE, setting up devlaunch
  for a team, or a pasted `devlaunch report v1` block.
- Workflow: confirm macOS; run `npx -y devlaunch@<pinned> init --dry-run --json`;
  summarise the plan and ask the user before running `init --yes --json`; handle
  exit codes; verify with `open --json`; tell the user how to open it next time.
  For teams, offer `init --team` and show the diff first.
- Fix workflow: for a pasted report, look up the code in references/errors.md,
  follow its agentHint, run `doctor --json` and `logs --json`, fix, verify.
- references/conventions.md: short guidance for projects that launch reliably
  (dev script, .nvmrc, server prints its URL, no interactive prompts at startup).
- references/errors.md and config.md are generated from core.
- Safety: ask before creating anything, never change system settings, never enable
  network access, never print secret values.
- Build step injects the pinned version, validates frontmatter, bundles into dist.

## CLI
`skill install [--agent <name>|--all] [--project]`, `skill uninstall`,
`skill path`. Before implementing, check each agent's current docs for its skill
directories (prefer cross-agent locations like .agents/skills/), record them in one
table in code with source links and the date checked. `init --team` offers to
commit the skill into the repo.

## Verification
Write evals/manual-checklist.md with ~12 scenarios (trigger, non-trigger such as
"deploy this to Vercel", broken-fixture reports, a monorepo). Run it in Claude
Code and at least one other agent; record results in the file.

Do not build yet: automated eval harness, plain-language/non-developer tone.
Done when: both agents pass at least 10 of 12 scenarios with no safety failures.
Milestone 2 complete; update Status.
````

---

## L1-6: Release, README, and site (Milestone 3)

````
Read CLAUDE.md first. Get devlaunch into strangers' hands.

## Messaging (short: marketing/messaging.md)
Launch 1 audience: developers and their teams. Pain points in their words: opening
an IDE just to run the app; nvm/PATH issues when launched outside the terminal;
forgetting ports; orphaned servers; teammates who can't run the app without help.
Headline options (pick one, e.g. "Your dev server, one keystroke away"), three
pillars with real proof (Spotlight + ready detection; team onboarding including
the double-click installer; agent-ready CLI and skill), FAQ (safety, no
postinstall, uninstall/eject, why not an alias, why not cmdbar or another menu bar
app, Windows not yet). Claims policy: only what exists; [PLACEHOLDER] for
unverified numbers; no invented testimonials; never disparage competitors.
Note in a final section which messages are reserved for Launch 2.

## Competitive analysis (marketing/competitive.md)
Research the current state of each (features, pricing, activity, date checked,
source links), then write an honest comparison. Include:
- Menu bar dev-server managers: cmdbar (closest: stack detection, one-click run,
  URL detection, free), Harbr, DevDock, Port Menu, and similar tools. Search for
  any new ones.
- The status quo: terminal tabs, shell aliases, VS Code tasks, Raycast script
  commands, process managers (pm2, overmind).
- Coding agents' built-in previews: the Claude Code desktop app starting dev
  servers in its Browser pane from `.claude/launch.json`, and similar features in
  other agent apps. Note that devlaunch imports launch.json.
- For Launch 2 context only (don't lead with it now): Pinokio, and hosted builders
  (Lovable, Bolt, v0, Replit).
For each, say where it's genuinely better. Then state our differentiation, in this
order: each project becomes its own app in Spotlight (no dashboard app to open);
the setup is committed to the repo so teammates get it with one command or a
double-click; nothing to install (npx, no Gatekeeper prompts); agents are first-
class users (JSON contract, skill); works with projects from any agent and without
the agent open. Finish with a two-to-three sentence answer to "Why not cmdbar?"
(and one for "Why not just let Claude Code run it?") that messaging.md, the FAQ,
and launch posts all reuse.
Also confirm our product name doesn't collide with these tools or other developer
tools (for example, "DevDock" is taken and Sentry has a tool called Spotlight).

## Release
Changeset for 0.1.0, package metadata, `files` whitelist, npm pack test (fresh
project, npx, no install scripts, vendored runtime and skill included). Report
tarball size.

## README (packages/cli/README.md, mirrored to root)
One-liner, GIF placeholder, install, 3-step quick start, for teams, for coding
agents (skill + contract link), what it handles, privacy and safety, uninstall,
eject. Scannable in 30 seconds.

## Site (apps/site)
One page plus a small Starlight docs section. Native-macOS inspired design, system
fonts, light/dark, no gradient blobs or stock art. Sections: hero with copyable
`npx devlaunch init` and an interactive Spotlight demo (visitors type a project
name; static under reduced motion); before/after ritual; how it works; "the boring
stuff, handled"; for teams (the --team diff and double-click installer); for
coding agents; "how it compares" (short, fair, from competitive.md); trust; FAQ;
final CTA. Docs: quick start, config reference and
error reference (generated), CLI reference, troubleshooting, uninstall/eject.
Static deploy workflow, Lighthouse 95+, no analytics by default.

Done when: 0.1.0 is published, the site is live, and three people who aren't you
have installed and used it without your help (record what confused them and fix the
top issues). Milestone 3 complete; update Status.
````

---

## L1-7: Launch kit (Milestone 4)

````
Read CLAUDE.md and marketing/messaging.md first. Create marketing/launch/:

1. demo-script.md: a 30-second GIF (init → ⌘ Space → app opens) and a 60-second
   video adding the team double-click flow. Exact commands, fixture, clean macOS
   recording settings, free tools.
2. Posts: Show HN (technical, candid, macOS-only up front, angle: a launcher with
   a CLI designed for agents as first-class users); r/reactjs and r/webdev (check
   and note self-promotion rules); X/Bluesky thread + single post; LinkedIn post
   for eng leads (onboarding and non-developer teammates).
3. Blog post: "Why your dev server breaks when you launch it from Spotlight" —
   genuinely teach the PATH and ready-detection problems; the tool is the ending.
4. Badge kit matching what `init --team` prints.
5. OG and social image templates rendered by a script.
6. launch-checklist.md: pre-launch gates (tested on a clean user account, doctor
   covers every known failure, README links work), launch-day order and timing,
   issue triage process, a week-after review, and the decision point for starting
   Launch 2 (what signals to look for). Add a monthly competitor watch: recheck
   competitive.md, especially coding agents' preview features (e.g. any "keep this
   app" or "save to Dock" option) and whether devlaunch still imports their run
   configs correctly.
7. prepared-answers.md: short, friendly replies for the questions launch threads
   will ask, reusing competitive.md: why not cmdbar / a menu bar app, why not just
   let Claude Code or my agent run it, why not an alias, is it safe, Windows?,
   does it work with my stack. Candid, never dismissive of other tools.

Finish with a claims table: claim → where it appears → what verifies it.
````

After launching, use this prompt for the stabilisation week (repeat as needed):

````
Read CLAUDE.md and LATER.md. Here is feedback from the launch: [paste issues,
comments, reports]. Group it into bugs, confusion (docs/copy problems), and feature
requests. Fix the bugs and confusion items now, in priority order, with tests.
Add feature requests to LATER.md with a count of how many people asked. Summarise
what you changed and what the requests suggest about Launch 2 priorities.
````

---

# Launch 2: AI builders

Start once Launch 1 has settled (bugs from launch week fixed). Reorder L2-1 to L2-3 if Launch 1 feedback points elsewhere.

## L2-1: Plain language and "Ask AI to fix this"

````
Read CLAUDE.md, LATER.md, and docs/roadmap.md. Launch 2 targets people who build
web apps with AI agents and aren't developers. Update CLAUDE.md Status and move the
Launch 2 items from LATER.md into the roadmap as current.

1. Rewrite every catalog title, explanation, and action label in plain language
   (no "port", "PID", "localhost", "CLI" in user-facing text; technical detail stays
   in developerDetail and logs). Keep developer-facing CLI output precise.
2. Rename [Copy Report] to [Ask AI to fix this] on project-code and devlaunch-bug
   dialogs; after copying, show: "Copied. Paste it into your AI assistant and ask
   it to fix the problem." Keep [View Logs] for developers.
3. Launchers created in agent mode default to headless; developers keep terminal.
4. Add `userMessage` (plain language) to the JSON envelope; bump schemaVersion and
   keep backwards compatibility; update the contract doc and schema.
Tests updated; run the smoke script. Done when a non-developer reads each dialog
and can say what to do next.
````

## L2-2: Secrets and setup assistant

````
Read CLAUDE.md first. Promote "Keychain secrets and setup assistant" from LATER.md.

- Detection: required env keys from .env.example/.sample/.template (key, comment
  hint, URL, public vs secret, optional).
- Config: enable the reserved `env.required` field.
- Runtime first-run assistant: welcome dialog, dependency install, then for each
  missing non-public key (no value in .env and none in Keychain): hidden-input
  dialog with hint, [Save] [Where do I get this?] [Skip if optional]. Store in the
  macOS Keychain (service dev.devlaunch.<slug>), inject only into the server's
  environment, never write to disk, never pass as argv (verify which `security`
  invocation keeps values out of the process list and document it).
- CLI: `secrets prompt` (opens the dialogs; what agents use), `secrets set <KEY>`
  from stdin, `secrets list` (names and status only), `secrets remove`; exit 3
  with SECRET_MISSING from init/open when keys are missing. `uninstall` offers to
  remove Keychain items.
- Add examples/ai-vite-express (needs OPENAI_API_KEY, starts without a real key)
  and a missing-env broken fixture. CI smoke test uses a temporary keychain.
Tests assert no secret value appears in logs, reports, clipboard, or argv.
````

## L2-3: Skill for AI builders and automated evals

````
Read CLAUDE.md first. Extend the skill for non-developer users and build the
automated eval harness (promote it from LATER.md).

- Description: add triggers in non-developer language ("how do I open what you
  built", "use it without the terminal", "make it an app on my Mac") and for
  agents finishing a new local web project for a non-developer.
- references/talking-to-users.md: plain language, no commands for the user to
  type, explain before acting, respect a no.
- Secrets flow: on SECRET_MISSING, tell the user a window will ask for keys, run
  `secrets prompt`; never ask for keys in chat.
- conventions.md: add .env.example with hints and URLs for every key.
- Evals: harness that copies a fixture to a temp HOME, installs the skill, runs
  Claude Code headless (check current docs for flags and permissions) with each
  scenario, and scores: triggered correctly, asked before acting, no secrets in
  chat, right commands and exit-code handling, and the outcome (launcher works or
  bug fixed). Results table and pass rates; manual workflow in CI.
Iterate until the agreed gate is met (suggested: ≥90% trigger accuracy, 100% on
safety criteria, ≥80% outcome success). Update the manual checklist for other
agents and rerun it.
````

## L2-4: Messaging and landing page for AI builders

````
Read CLAUDE.md, marketing/messaging.md, and eval results first.

- Messaging: add the AI-builder audience (pain: the wall of terminal instructions at
  the end of the chat, not knowing how to reopen the app tomorrow, .env confusion),
  headline "You built it with AI. Now open it like any other app." (or a better
  tested option), pillars (opens like an app, your AI sets it up, your AI fixes it,
  your keys stay yours), the paste-this-sentence CTA (verified to trigger the skill
  in evals), and FAQ (safety, which AI tools — only tested ones as plain text,
  "does it put my app online?" no, Windows not yet, vs hosted builders — be fair).
  Two registers: plain for AI builders, precise for developers.
- Competitive: re-research and update competitive.md for this audience. Lead with
  coding agents' built-in previews (the biggest threat) and Pinokio (closest in
  spirit: one-click local launchers, agent control, cross-platform, but built
  around a catalog of community apps rather than the app you built). Our angle:
  your app opens on its own, tomorrow and next week, without reopening the chat,
  whichever agent built it. If an agent app has since added a "keep this app"
  feature, say so honestly and sharpen the angle (works across agents, repo-level
  sharing, fix loop). Add FAQ entries: "My AI already shows a preview — why do I
  need this?" and "How is this different from Pinokio?".
- Site: decide with me whether the home page becomes AI-builder-first (with the
  developer section below) or a dedicated /ai page is added; propose both with
  trade-offs before building. Add the chat → Spotlight → app demo, the fix-loop
  and secrets sections using real dialog text, a no-terminal getting-started guide,
  a "for agents" docs page, and /llms.txt.
````

## L2-5: Launch 2 kit

````
Read CLAUDE.md, messaging.md, and audiences notes first. Create marketing/launch-2/:
demo script (chat → Spotlight → app, plus fix loop), posts for AI-builder
communities (respect their rules), a blog post "Your AI built you an app. Here's
why you can't open it tomorrow", a developer post "Designing a CLI whose main user
is an AI agent", skill directory and marketplace listings (research current ones),
a checklist including the eval gate and a clean-account test with no developer
tools installed, and a claims table.
````

---

## After Launch 2

LATER.md is your backlog, ordered by what users actually ask for. The likely candidates and their outlines:

- **Managed runtimes and Python backends:** download verified Node/uv into Application Support, support FastAPI/Flask/Django processes.
- **Multi-process launchers:** frontend and API in one app, stopping together.
- **Open on my phone:** opt-in LAN sharing with a QR code page.
- **Menu bar app:** a Swift companion listing all launchers with start/stop and fix reports, using the vendored CLI. This is crowded territory (cmdbar, Harbr, DevDock, and others), so only build it on clear user demand, and make it an extension of the per-project apps rather than another dashboard.
- **More run-config importers:** VS Code tasks, other agents' preview configs, Procfiles, added through the `RunConfigImporter` interface.
- **Windows:** a platform adapter with Start Menu shortcuts, PowerShell runtime, and Credential Manager.

When one gets promoted, write its prompt in the same format: goal, scope, "do not build yet", and "done when".
