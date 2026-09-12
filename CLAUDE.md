# CLAUDE.md

Context for future sessions working in this repo. Read this first.

## What devlaunch is

devlaunch turns any local web project into a macOS app that opens from Spotlight,
starts the dev server, and opens the browser once the app is ready.

**Two launches**

- **Launch 1 (current):** developers and the non-developers they work with
  (designers, PMs, QA). Pitch: stop opening an IDE and terminal just to run your
  app, and give your teammates a one-click way to run it. The CLI is agent-ready
  from day one (JSON output, exit codes, error catalog) and ships with an Agent
  Skill so coding agents can set it up.
- **Launch 2 (next):** people who build web apps with AI agents and aren't
  developers. Adds plain-language dialogs, "Ask AI to fix this", Keychain secrets
  with a setup assistant, and a skill tuned for them.

**Two tracks in this repo**

1. **Implementation** — the published npm package: core engine + CLI + launcher runtime.
2. **Marketing** — a website and launch artifacts positioned around the pain points
   the tool solves.

## Repo map

| Path | Responsibility | Boundary |
| --- | --- | --- |
| `packages/core` | Pure TS: project detection, config resolution, bundle generation. | Never touches `process.stdout` / `process.stderr`, never prompts, never reads `process.argv`, never calls `process.exit`. Returns plain data and typed `DevlaunchError`s. No dependencies. |
| `packages/cli` | The published `devlaunch` bin. A thin layer over `core`. | Owns **all** I/O: argv parsing, prompts, stdout/stderr, exit codes, and native macOS dialogs. Ships as one bundled file with zero runtime dependencies. |
| `packages/runtime` | Text templates copied into generated `.app` bundles: `launcher.sh`, `Info.plist`, `run.command`. | No TypeScript runtime. Templates + shell/`bats` tests only. Must pass ShellCheck. |
| `apps/site` | Marketing site + `/docs` (Astro + Starlight). | No dependency on `packages/*`. Docs content lives in `src/content/docs/docs/`. |
| `examples/*` | Real fixture projects for e2e tests. | Outside the pnpm workspace. Each has its own lockfile / package manager. |
| `marketing/` | Non-site launch artifacts. | `marketing/messaging.md` (later) is the source of truth for all copy. |

`core` and `runtime` are private (`"private": true`) and bundled into `cli` at build
time via tsup `noExternal`. Only `packages/cli` (package name `devlaunch`) is
published to npm.

## Commands

```sh
pnpm install                 # install workspace deps (packages/*, apps/*; not examples/*)
pnpm build                   # turbo run build — core + cli emit dist/, site builds
pnpm test                    # turbo run test — Vitest unit tests (core, cli)
pnpm test:e2e                # turbo run test:e2e — macOS end-to-end (placeholder for now)
pnpm lint                    # turbo run lint — Biome check
pnpm typecheck               # turbo run typecheck — tsc --noEmit, strict
pnpm format                  # biome format --write .

# run the CLI locally against a fixture
pnpm --filter devlaunch dev -- init --cwd examples/vite-react

# run the built CLI directly
node packages/cli/dist/index.js --help

# run the site
pnpm --filter @devlaunch/site dev

# shell templates (needs shellcheck + bats-core installed)
pnpm --filter @devlaunch/runtime lint:shell
pnpm --filter @devlaunch/runtime test:shell
```

## Principles

1. **Agent-ready contract:** every command supports `--json`, non-interactive use,
   `--dry-run` where it changes anything, and stable exit codes.
2. **One error catalog** in `packages/core` feeds dialogs, CLI output, docs, and the
   skill. Generated files are never edited by hand.
3. **No postinstall hooks.** Non-macOS platforms exit cleanly with a friendly message.
4. **Every change devlaunch makes has an undo command.**
5. **Reports and logs shown to users are redacted of secret values.** devlaunch
   never stores secret values in Launch 1; projects keep using their own `.env`.
6. **Nothing is exposed to the network by default.**
7. **Core is platform-neutral;** macOS specifics sit behind a platform adapter.
8. **All user-facing strings live in one place,** so Launch 2 can rewrite them in
   plain language without touching logic.

## Conventions

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, …).
- **Changesets** for every user-facing change: `pnpm changeset`, select `devlaunch`.
  `core` / `runtime` / `site` are in the changeset `ignore` list.
- **Tests are required for detection logic.** Any code in `packages/core` that infers
  something about a project ships with unit tests covering the fixture shapes in
  `examples/`.
- Keep the `core` / `cli` boundary strict: if you find yourself importing `node:fs`
  prompts or writing to stdout inside `core`, move it to `cli`.

## Launches and milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| M1: works on my Mac | L1-1 core engine, L1-2 launcher runtime, L1-3 CLI | In progress — L1-1 done |
| M2: team- and agent-ready | L1-4 team onboarding, L1-5 developer Agent Skill | Not started |
| M3: a stranger can do it | L1-6 release, README, site | Not started |
| M4: launch | L1-7 launch kit | Not started |
| Launch 2 | L2-1 plain language + fix loop, L2-2 secrets, L2-3 AI-builder skill + evals, L2-4 messaging + landing page, L2-5 launch kit | Not started |

Full prompt-by-prompt detail lives in `devlaunch-claude-code-prompts-v3.md`.

## Scope rule

Do not build anything in `LATER.md` unless a prompt explicitly promotes it out of
that file and into the current milestone.

## Status

**Current prompt:** L1-1 (Core engine) — done.

**Done:**
- Prompt 1: monorepo scaffold (workspace, tooling, placeholder packages).
- L1-0: rewrote this file's product context and principles for the two-launch
  plan; added the Launches/Status/Scope sections; created `LATER.md`,
  `docs/roadmap.md`, `docs/decisions/0001-two-launches.md`; added
  `examples/broken/` fixtures (missing-dependency, crash-on-start,
  wrong-port-config, node-version-mismatch) for error-path tests.
- L1-1: built `packages/core` end to end, in 8 commits (one per sub-step):
  - **Error catalog** (`src/errors`) — every code from the spec plus a few
    more, generated shell strings / site docs / skill reference.
  - **Redaction** (`src/redact`) — `.env`-value and pattern-based (sk-,
    ghp_, AKIA, xox*-, JWT, Bearer, password=) redaction.
  - **Detection** (`src/detect`) — package manager, dev script, 7
    frameworks + generic fallback, Node version, monorepo workspace apps,
    icon candidates, and a `RunConfigImporter` for `.claude/launch.json`
    (format verified against Claude Code's live docs). New fixture:
    `examples/with-claude-launch-json/`.
  - **Config** (`src/config`) — layered resolution (defaults < package.json
    `launcher` < `.devlaunch.local.json` < flags), monorepo arrays,
    `processes`/`env` rejected with a clear message, JSON Schema exported
    to `schemas/config.schema.json`.
  - **Report builder** (`src/report`) — the `devlaunch report v1` text,
    redacted, capped at ~12k chars, snapshot-tested per broken fixture.
  - **Platform adapter** (`src/platform`) — bundle I/O, Spotlight,
    dialogs/notifications via osascript, `open`, PNG→icns — the only part
    of core that touches the real machine, behind a mockable command
    runner; `unsupported` implementation for non-macOS.
  - **Bundle plan** (`src/bundle`) — pure `planBundle()` (naming/collision
    resolution, template substitution) then I/O `writeBundle()` (files +
    registry + Spotlight registration via the platform adapter).
  - **Icon conversion** (`src/icon`) — real sips/iconutil PNG→icns, with a
    checked-in default icon (`packages/runtime/assets/default-icon.icns`)
    for projects with no icon of their own.
  - Along the way: fixed two real bugs the tests caught (a tsup dts-bundler
    issue with composite TS projects, and a bare `__TOKEN__` used as a
    plist boolean tag that broke `plutil -lint` on the raw runtime
    template) and closed a gap (Info.plist never referenced its icon —
    added `CFBundleIconFile`).
  - 169 tests in `packages/core`, all passing; typecheck/lint/build clean
    workspace-wide after every commit.

**Next:** L1-2 — `packages/runtime`'s launcher.sh gets its real logic (it's
still a placeholder): login shell + Node version activation, single-instance
PID handling, dependency install, port-in-use handling, terminal/headless
start, ready detection, and the Copy Report flow — driven by the
`Resources/launcher.env` and `strings.sh` that `packages/core` already
generates.

**Open questions:**
- The vendored CLI (`Resources/devlaunch.mjs`) and the runtime template text
  are passed into `planBundle`/`writeBundle` as plain strings rather than
  read from disk by core (core stays dependency- and fs-write-free outside
  `src/platform`) — confirm this is still the right seam once L1-3's CLI is
  the one assembling those inputs for real.
