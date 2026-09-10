# devlaunch: Claude Code prompt pack

Six prompts, run in order, each in a fresh Claude Code session from the repo root. Commit after each one before starting the next.

"devlaunch" is a working name. Check npm availability first (`npm view devlaunch`), then find-and-replace across these prompts if you pick something else.

| # | Prompt | Track | Output |
|---|--------|-------|--------|
| 1 | Monorepo setup | Foundation | Workspace, tooling, CI, `CLAUDE.md` |
| 2 | Core engine and launcher runtime | Implementation | Detection, config, `.app` generation, shell runtime |
| 3 | CLI and team adoption | Implementation | `npx devlaunch` commands, e2e tests, release pipeline |
| 4 | Positioning and messaging | Marketing | Messaging doc that every other artifact draws from |
| 5 | Marketing site | Marketing | Astro site with interactive Spotlight demo and docs |
| 6 | Launch artifacts | Marketing | README, launch posts, demo script, badge, OG images |

Prompts 4 to 6 can run in parallel with 2 and 3 on a separate branch, but prompt 5 reads the output of prompt 4, and prompt 6 is more accurate once the CLI exists.

---

## Prompt 1: Monorepo setup

````
You are setting up a new monorepo for an open-source developer tool called "devlaunch".
Do not write product logic yet. This session is only about structure, tooling, and
project context that later sessions will build on.

## Product context (write this into CLAUDE.md so future sessions have it)

devlaunch turns any local dev server (e.g. `npm run dev` in a React/Vite/Next project)
into a macOS app you launch from Spotlight. A developer runs `npx devlaunch init` in a
project; the tool detects the package manager, dev script, framework, port, and Node
version, then generates a small `.app` bundle in `~/Applications`. Typing the project
name in Spotlight starts the server and opens the browser once it is ready.

Audiences:
- Developers who want to stop opening an IDE or terminal just to run a dev server.
- Non-technical teammates (designers, PMs, QA) who need the app running locally.
- Maintainers/eng leads who want one-line onboarding for their repo.

The repo has two tracks:
1. Implementation: the published npm package (core engine + CLI + launcher runtime).
2. Marketing: a website and launch artifacts that position the tool around the pain
   points it solves.

## Target structure

```
devlaunch/
├── packages/
│   ├── core/          # pure TS: detection, config resolution, bundle generation
│   ├── cli/           # the published `devlaunch` bin; thin layer over core
│   └── runtime/       # launcher shell script, Info.plist, .command templates
├── apps/
│   └── site/          # marketing site + docs (Astro)
├── examples/          # fixture projects used by e2e tests
│   ├── vite-react/
│   ├── next-app/
│   └── pnpm-monorepo/
├── marketing/         # non-site artifacts: messaging, posts, scripts, press kit
├── .github/workflows/
├── CLAUDE.md
└── README.md
```

## Tooling decisions

- pnpm workspaces + Turborepo for task orchestration.
- TypeScript everywhere, strict mode, shared base tsconfig.
- tsup to bundle the CLI into a single file with zero runtime dependencies where
  possible. The published package must have no native modules and no install scripts.
- Vitest for unit tests. bats-core for shell script tests. ShellCheck for linting
  shell templates.
- Biome for lint + format (one tool, fast).
- Changesets for versioning and publishing `packages/cli` to npm. `core` and
  `runtime` are internal and get bundled into `cli`; mark them private.
- Node >= 18. Add `.nvmrc`.
- Astro for `apps/site` (just scaffold it with a placeholder page; the real site
  comes later). Use Starlight for a `/docs` section.

## CI (GitHub Actions)

- `ci.yml`: on PR and main. Jobs: lint, typecheck, unit tests on ubuntu-latest;
  shell tests + ShellCheck on ubuntu-latest; e2e job on macos-latest (placeholder
  that runs a no-op test for now, so the job exists and is wired up).
- `release.yml`: Changesets release PR flow, publish on merge. Leave the npm token
  as a documented secret; do not add real secrets.
- `site.yml`: build the site on PRs that touch `apps/site` or `marketing/`.

## CLAUDE.md contents

Write a CLAUDE.md that includes:
- The product context above, condensed.
- The repo map with one line per package explaining its responsibility and its
  boundaries (e.g. "core never touches process.stdout or prompts; cli owns all I/O").
- Commands: install, build, test, lint, run the CLI locally against an example
  (`pnpm --filter cli dev -- init --cwd examples/vite-react`), run the site.
- Non-negotiable product principles:
  - Never modify the user's system from `npm install` (no postinstall hooks).
  - Every failure the end user can hit must produce a native macOS dialog with an
    action, never a silent failure.
  - Generated launchers contain no secrets and only absolute paths on the user's
    own machine; nothing machine-specific is ever committed to a user's repo.
  - Non-macOS platforms must exit cleanly with a friendly message, never crash.
  - Adoption must be reversible: every change the tool makes has an undo command.
- Conventions: conventional commits, changesets for user-facing changes, tests
  required for detection logic.

## Also create

- Root README.md: short, internal-facing for now (what this repo is, how to develop).
  The public README gets written in a later session.
- `examples/` fixtures: minimal but real. vite-react (npm lockfile, `.nvmrc`),
  next-app (pnpm lockfile), pnpm-monorepo (two apps under `apps/`, yarn or pnpm
  workspace). They only need to run their dev server; keep dependencies minimal.
- A `marketing/README.md` explaining that this folder holds messaging and launch
  artifacts, and that `marketing/messaging.md` (created later) is the source of truth
  for all copy.
- LICENSE (MIT), .gitignore, .editorconfig.

## How to work

1. First, show me the plan: the exact file tree you will create and any tooling
   choice you would change and why. Wait for my approval.
2. Then implement it.
3. Verify: `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm test` all pass, and the
   site dev server starts. Report the output.
4. Summarize what was created and anything you deferred.
````

---

## Prompt 2: Core engine and launcher runtime

````
Read CLAUDE.md first. This session implements `packages/core` and `packages/runtime`.
No CLI commands or prompts yet; that is the next session. Everything here must be
testable without a Mac, except the parts explicitly marked macOS-only.

## packages/core

### 1. Project detection  (`detect.ts`)
Given a directory, return a typed `DetectedProject`:
- Package manager from lockfile: pnpm-lock.yaml, yarn.lock, bun.lockb/bun.lock,
  package-lock.json. Fall back to npm. Respect the `packageManager` field if present.
- Dev script: prefer `dev`, then `start`, then `serve`. Return all candidates so
  the CLI can offer a choice.
- Framework from dependencies: vite, next, react-scripts, remix, astro, nuxt,
  sveltekit. Map each to a default port and a "ready line" regex (e.g. Vite's
  `Local:\s+(http://\S+)`, Next's `- Local:\s+(http://\S+)`). Include a generic
  fallback regex for any `http://localhost:\d+` or `http://127.0.0.1:\d+`.
- Node version source: `.nvmrc`, `.node-version`, `package.json` volta field,
  `engines.node`. Record the source and the requested version.
- Workspace detection: pnpm-workspace.yaml, `workspaces` in package.json. Return
  the list of workspace apps that have a dev script.
- Icon candidates, in priority order: configured path, `public/logo.png`,
  `public/apple-touch-icon.png`, `public/favicon.png`, `public/favicon.svg`,
  `app/icon.png`, `src/assets/logo.*`.

Write table-driven unit tests against the `examples/` fixtures plus small inline
fixtures for edge cases (no lockfile, multiple lockfiles, no dev script).

### 2. Config resolution  (`config.ts`)
Merge, in increasing priority: detected defaults < `launcher` key in package.json
< `.devlaunch.local.json` (gitignored, per developer) < CLI flags.

Schema (validate with a small hand-written validator or zod bundled in):
```ts
type LauncherConfig = {
  name: string;
  script: string;
  port?: number;
  icon?: string;
  mode: "terminal" | "headless";
  browser?: string;               // default system browser
  openPath?: string;              // e.g. "/dashboard"
  readyTimeoutSeconds: number;    // default 60
  processes?: Array<{ name: string; cwd: string; script: string }>; // multi-process
};
```
The package.json `launcher` key may also be an array of these for monorepos.
Return clear, human-readable validation errors.

### 3. Bundle generation  (`bundle.ts`)
Produce a plan (list of files + contents + modes) as pure data, then a separate
`writeBundle(plan)` that performs I/O. The plan approach makes it unit-testable.

Bundle layout:
```
~/Applications/<Name>.app/Contents/
  Info.plist
  MacOS/launcher          (from packages/runtime, chmod 755)
  Resources/launcher.env  (resolved config as shell-safe KEY=value lines)
  Resources/icon.icns
```
- Info.plist: unique bundle id `dev.devlaunch.<slug>`, `CFBundleName`,
  `LSUIElement` true for headless mode, and a `DevlaunchVersion` key so later
  versions can detect stale launchers.
- Name collisions: if a launcher with the same name points at a different
  project path, return a collision result with a suggested suffix
  (e.g. "Acme Dashboard (feature-x)" using the git branch or folder name).
- Idempotency: re-generating for the same project path replaces in place.
- Registry: maintain `~/Library/Application Support/devlaunch/registry.json`
  listing every launcher (name, project path, app path, version, created/updated).

### 4. Icon generation  (`icon.ts`, macOS-only)
Use `sips` and `iconutil` to build an `.icns` from a PNG. For SVG sources, try
`qlmanage -t` to rasterize; if that fails, fall back. Fallback: a generated default
icon (a rounded square with the project's initials) rendered to PNG. Keep the
fallback renderer dependency-free (write a tiny PNG encoder or ship a template
PNG plus an overlay step via `sips`). Isolate all shell-outs behind an interface
so tests can mock them.

## packages/runtime

The launcher is a POSIX-leaning zsh script, templated with nothing machine-specific
except reading `../Resources/launcher.env`. Keep it readable; it will be audited
by cautious users. Split helpers into functions. Requirements:

1. Environment: run under a login shell so nvm/fnm/volta/asdf initialise. If the
   project requests a Node version (from launcher.env), activate it via whichever
   manager is present. If `node` still is not found, show a dialog:
   "Node.js wasn't found" with buttons [Install Node] (opens nodejs.org)
   [Run Diagnostics] (opens Terminal running `npx devlaunch doctor`) [Cancel].
2. Project check: if the project directory no longer exists, dialog:
   "The project folder was moved or deleted" [Locate Folder…] (choose folder,
   update launcher.env) [Remove Launcher] [Cancel].
3. Single instance: PID file at
   `~/Library/Application Support/devlaunch/run/<slug>.pid`. If the process is
   alive (and the port responds, when known), show the quick menu:
   [Open in Browser] [Restart] [Stop]. Clean up stale PID files.
4. Dependencies: if `node_modules` is missing, or the lockfile hash differs from
   the hash stored after the last successful install, run the detected package
   manager's install first. Notify: "Installing dependencies…".
5. Port conflict: if the configured port is busy and not ours, dialog:
   "Port 5173 is in use by another app" [Use Next Port] [Quit Other Process]
   [Cancel]. Only offer "Quit Other Process" with a second confirmation that names
   the process (from `lsof`).
6. Start:
   - headless: run the script in the background, stdout/stderr to
     `~/Library/Logs/devlaunch/<slug>.log` (rotate at 5 MB, keep 3).
   - terminal: open a Terminal window via osascript running the script, with
     output also tee'd to the same log file so ready detection works identically.
   - multi-process configs: start each process, one log per process, one PID
     file per process; stopping stops all.
7. Ready detection: tail the log, match the ready regex, extract the URL; fall back
   to polling the port. On success open the browser at URL + openPath and notify
   "Ready at localhost:5173". On timeout or early exit, dialog:
   "The server stopped before it was ready" [View Logs] (opens in Console.app)
   [Retry] [Cancel].
8. Notifications via `osascript -e 'display notification …'`. All dialogs via
   `osascript` `display dialog` with explicit buttons. Put all user-facing strings
   at the top of the script so they are easy to edit and later localise.

Tests: bats-core tests that stub `osascript`, `lsof`, `open`, and the package
manager with fake executables on PATH, then assert on behaviour (which dialog was
requested, which command ran). ShellCheck must pass with no warnings.

## Deliverables and verification

- `pnpm test` passes (unit + bats). ShellCheck clean.
- A macOS-only integration script `scripts/smoke-macos.sh` that generates a bundle
  for `examples/vite-react` into a temp Applications dir, runs the launcher
  headless, waits for ready, curls the URL, and stops it. Wire it into the
  macos-latest CI job, replacing the placeholder.
- Update CLAUDE.md with anything future sessions need to know (e.g. how to run
  the smoke test, where strings live).

Before writing code, list any requirement above you think is wrong, risky, or
underspecified, and propose alternatives. Then implement in this order: detect,
config, bundle plan, runtime script, icon, write/registry, tests, smoke script.
Commit after each step.
````

---

## Prompt 3: CLI and team adoption

````
Read CLAUDE.md first. Core and runtime exist. This session builds `packages/cli`,
the published `devlaunch` binary, and the release pipeline. The CLI owns all I/O
and prompts; business logic stays in core.

## Commands

`devlaunch init [--cwd <dir>] [--yes] [--team] [--name] [--script] [--mode]`
- On non-macOS: print a friendly one-liner and exit 0 (so it never breaks CI or
  teammates on other platforms).
- Show a "Detected" summary (package manager, script, port, Node version + source),
  then prompts with smart defaults for: name, icon, mode, and "save to package.json
  for your team?". Skip prompts entirely if a `launcher` config already exists or
  `--yes` is passed.
- For monorepos with several workspace apps, ask which apps get launchers (multi-
  select), and offer a combined launcher that starts several processes together.
- Handle name collisions using core's suggestion; confirm with the user.
- End with: where the app is, how to launch it ("Press ⌘ Space and type …"),
  and "Try it now? (Y/n)" which runs the launcher.
- Run `mdimport` on the new bundle so Spotlight picks it up immediately.

`devlaunch init --team`
Everything above, plus: add `launcher` config to package.json, add devlaunch as a
pinned devDependency, add `"launcher": "devlaunch init"` script, add
`.devlaunch.local.json` to .gitignore, create `Install Launcher.command` at the repo
root (double-clickable, runs `npx devlaunch init --yes` then shows a "Done" dialog),
and print a README snippet including a "Launch from Spotlight" badge in Markdown.
Show a diff-style summary of every file change before writing and ask to confirm.

`devlaunch list` - table of registered launchers: name, project path, status
(running/stopped/broken), version. Mark launchers built by an older version.

`devlaunch stop [name]` - stop one or all running launchers.

`devlaunch doctor [--cwd]` - checks with pass/fail and a fix hint for each:
macOS version, Node found under a login shell vs current shell (and which manager),
requested Node version available, Spotlight indexing enabled for ~/Applications,
config valid, port free, icon tools present, stale launchers, stale PID files.
Output should be copy-pasteable into a bug report (`--json` too).

`devlaunch upgrade` - regenerate all launchers built by older versions.

`devlaunch uninstall [name|--all]` - remove app bundle(s), logs, PID files,
registry entries. Confirm first.

`devlaunch eject` - reverse `--team`: remove config, devDependency, script,
gitignore line, and `.command` file. Show the diff and confirm.

## UX requirements

- Use a tiny prompt library bundled into the output (e.g. @clack/prompts) or
  write minimal prompts; the final `dist/` must be a single file with no runtime
  dependencies.
- Respect `NO_COLOR`, non-TTY environments (fall back to `--yes` behaviour with
  defaults and clear logging), and `--json` on read commands.
- Every error message says what happened, why, and what to do next.
- `--help` for each command with an example.
- Anonymous telemetry: none. State this in the README and `--help` footer.

## Tests

- Unit tests for argument parsing and each command's decision logic with core
  mocked.
- Snapshot tests for `init --team` file changes against each example fixture.
- macOS e2e in CI: `init --yes` on each example into a temp HOME, assert the bundle
  exists and is valid (`plutil -lint`), run the launcher headless, curl the URL,
  `stop`, `uninstall`, and assert nothing is left behind.
- A test that runs `npm pack` and installs the tarball in a fresh temp project to
  confirm the published package works via `npx` with no postinstall.

## Release

- Changeset for 0.1.0. Package metadata: description, keywords (spotlight, macos,
  dev-server, launcher, vite, react, nextjs), repository, homepage (the site),
  `os` field left open (so installs don't fail on Linux/Windows), `engines.node`.
- `files` whitelist so only `dist/`, README, LICENSE ship. Check final tarball size
  and report it.

Plan first: list the commands, the shared modules you will create, and the test
matrix. Wait for approval, then implement command by command with a commit each.
Finish by running the full test suite and the npm pack test, and report results.
````

---

## Prompt 4: Positioning and messaging

````
Read CLAUDE.md first. This session creates the messaging foundation for all
marketing. Output goes in `marketing/`. No site code yet.

## Deliverable 1: marketing/messaging.md (source of truth for all copy)

1. Pain points, written in the audience's own words, with a concrete scenario
   for each:
   - Developer: "I open VS Code, wait for it to load, open a terminal, cd, and run
     npm run dev, every single morning, just to look at the app."
   - Non-technical teammate: "I need the app running to review designs, but I have
     to ask a developer or follow a README I don't understand."
   - Maintainer / eng lead: "Onboarding docs keep growing. Every new hire hits the
     same nvm/port/install problems."
   - Everyone: "It worked in my terminal but not when I clicked it" (the PATH
     problem), orphaned servers hogging ports, forgetting which port a project uses.
2. Positioning statement (For / who / devlaunch is / that / unlike).
3. Category framing: "the Spotlight shortcut for your dev server". Explain why we
   are not a process manager, Docker, or an IDE plugin, and how we coexist with them.
4. One-liner options (10), headline options (10), and a recommended pick for each
   with reasoning. Prioritise concrete over clever. Example directions:
   "Your dev server, one keystroke away." / "Stop opening your IDE just to run
   npm run dev."
5. Messaging pillars (3 to 4), each with: claim, proof point from the actual
   product behaviour (reference real features: ready detection, PATH handling,
   single instance, native dialogs, one-command team setup, eject), and the
   objection it answers.
6. Objection handling / FAQ: "Is it safe?" (no postinstall, readable shell script,
   no telemetry, nothing leaves the machine), "Will it break my repo?" (tiny diff,
   eject), "What about Windows/Linux?" (roadmap, graceful no-op today), "Why not
   just an alias?" (aliases need a terminal; non-devs; ready detection; icons),
   "Does it work with my stack?" (any package.json script; list detected
   frameworks).
7. Voice and tone: friendly, precise, developer-to-developer, lightly playful,
   never hypey. A do/don't word list (e.g. avoid "revolutionary", "seamless",
   "10x"; prefer specific verbs and numbers we can actually back up).
8. Proof and claims policy: only claim what the product does today. Mark every
   unverified number or quote as `[PLACEHOLDER]`. Never invent testimonials,
   user counts, or company logos.

## Deliverable 2: marketing/audiences.md
A short page per audience: where they hang out (e.g. r/reactjs, X/Bluesky dev
community, Hacker News, design-tool communities, eng-manager newsletters), what
convinces them, which pillar leads, and the primary call to action for each.

## Deliverable 3: marketing/competitive.md
Honest comparison against the alternatives people use today: shell aliases,
Automator/Shortcuts apps, VS Code tasks, `concurrently` + README instructions,
Raycast script commands, Laravel Herd-style menu bar apps (as inspiration, not
direct competitors). Where the alternative is genuinely better, say so.

Read the actual implementation in packages/ before writing so claims match
reality. List any feature gaps you notice that weaken the messaging, as a
section at the end of messaging.md titled "Product gaps that affect messaging".
````

---

## Prompt 5: Marketing site

````
Read CLAUDE.md and marketing/messaging.md first. All copy must come from
messaging.md; if you need copy that doesn't exist there, add it there first, then
use it. Build the site in `apps/site` (Astro, Starlight for /docs).

## Design direction

Native-macOS inspired, not a generic SaaS template. Think system materials,
SF-style typography (use a system font stack; don't bundle Apple fonts), subtle
translucency, generous whitespace, one accent colour. Light and dark mode that
follow the system. Avoid gradient-blob backgrounds, stock illustrations, and
emoji. It should feel like a well-made Mac utility's website.

## Pages and sections

Home:
1. Hero: headline, one-liner, copyable `npx devlaunch init` with a copy button,
   secondary link to docs. Next to it, the interactive centrepiece: a recreated
   Spotlight bar (built in HTML/CSS/JS, not a screenshot) that types a project
   name, shows the launcher result with its icon, "presses Enter", then shows a
   small browser window loading localhost. Loop with a pause; respect
   prefers-reduced-motion with a static final frame. Let users type their own
   project name into it.
2. The pain: "Before" vs "After". Left: the ritual (open IDE, wait, terminal, cd,
   run, find the port, open the browser) as an animated checklist with a timer.
   Right: ⌘ Space, type, Enter.
3. How it works: three steps (run init, press ⌘ Space, you're in) with a real
   terminal transcript of `devlaunch init` taken from the actual CLI output.
4. "The boring stuff, handled": grid of edge cases with one line each (Node via
   nvm/fnm/Volta, opens only when ready, already running → quick menu, missing
   dependencies, port conflicts, moved projects, custom icons, logs in Console).
   Each card shows the actual native dialog or notification text.
5. For teams: the `--team` flow, the six-line package.json diff, the
   double-click installer for non-developers, and eject.
6. Trust: no postinstall, no telemetry, readable launcher script (link to it on
   GitHub), MIT licensed, uninstall in one command.
7. FAQ from messaging.md.
8. Final CTA with the command again and a GitHub star link.

/docs (Starlight): getting started, configuration reference (generated from the
config schema in packages/core so it never drifts), CLI reference (generated from
the CLI's help definitions), monorepos, troubleshooting (mirror every doctor
check and every dialog, with fixes), uninstall/eject, FAQ.

/badge: page that generates the "Launch from Spotlight" README badge snippet.

## Technical requirements

- Static output, deployable to GitHub Pages or Vercel. Add the deploy workflow.
- Lighthouse: 95+ on performance, accessibility, best practices, SEO. Report scores.
- Keyboard accessible demo, visible focus states, alt text, semantic headings.
- Open Graph and Twitter card meta per page; generate OG images at build time
  (Satori or similar) using the site's design language.
- Minimal client JS: only the Spotlight demo, before/after animation, and copy
  buttons are interactive (Astro islands).
- No analytics by default. If you add an option, make it privacy-friendly and off
  unless an env var is set.

Plan first: show the sitemap, the component list, and a written description of
the hero demo's animation timeline. Wait for approval. Then build section by
section, running the dev server and checking each in light and dark mode.
````

---

## Prompt 6: Launch artifacts

````
Read CLAUDE.md, marketing/messaging.md, marketing/audiences.md, and the current
CLI behaviour in packages/cli. Create the launch artifacts below in
`marketing/launch/` unless noted. Follow the voice guide and claims policy strictly:
no invented numbers, quotes, or users; use [PLACEHOLDER] where real data is needed.

1. Public README (`packages/cli/README.md`, also used as the GitHub repo README
   via root README link or copy step in CI). This is the most-read marketing asset.
   Structure: one-liner, demo GIF placeholder with exact recording notes, install
   command, 3-step quick start, "for teams" section, what it handles, config
   reference (short, links to docs), safety/privacy section, uninstall, FAQ link,
   contributing. Scannable in 30 seconds.

2. Demo recording script (`demo-script.md`): shot list for a 30-second GIF and a
   90-second video. Include exact terminal commands, the example project to use,
   macOS settings for clean recording (hide desktop icons, menu bar clock, etc.),
   and captions. Recommend free tools (e.g. Kap or macOS screen recording + gifski).

3. Launch posts, each tailored to its audience and platform norms:
   - Show HN post (title + body; plain, technical, honest about limitations,
     macOS-only noted up front).
   - r/reactjs and r/webdev posts (lead with the problem; follow each subreddit's
     self-promotion norms and say so in a note).
   - X/Bluesky thread (6 to 8 posts) and a single-post version.
   - LinkedIn post aimed at eng leads (onboarding angle).
   - Product Hunt listing: tagline, description, first comment from the maker,
     gallery image list.
   - dev.to / blog post: "Why your dev server isn't in Spotlight (and how to put it
     there)". Teach the PATH problem and ready detection genuinely; the tool is the
     conclusion, not the opening.

4. README badge kit (`marketing/badge/`): SVG badge in light and dark variants,
   Markdown and HTML snippets, and a short note on how `init --team` prints it.
   This is a distribution loop: every adopting repo advertises the tool.

5. Social/OG image specs and source files (`marketing/images/`): 1200x630 OG,
   1600x900 Product Hunt gallery frames (4), square social image. Build them as
   HTML/SVG templates rendered to PNG with a script so they can be regenerated
   when copy changes.

6. Launch checklist (`launch-checklist.md`): pre-launch (npm name, domain, docs
   complete, doctor covers known issues, test on a clean Mac user account),
   launch-day sequence and timing per platform, how to respond to feedback and
   issues, and week-after follow-ups.

After writing, do a consistency pass: every claim across all artifacts must match
the current product and messaging.md. Output a table of claims → where they
appear → verified against which file/feature. Flag anything you could not verify.
````

---

## Tips for running these

Start each prompt in a fresh session so context stays focused; `CLAUDE.md` carries the shared knowledge between sessions. Let Claude Code show its plan when a prompt asks for one, and push back there, since changing direction at the plan stage is much cheaper than after implementation.

If a session runs long, ask Claude Code to update `CLAUDE.md` with progress and open questions before you end it, then start the next session with "Read CLAUDE.md and continue from the open items."

Test the real launcher on a clean macOS user account before launching publicly. That is the only reliable way to catch PATH and Spotlight-indexing issues that never show up on your own machine.
