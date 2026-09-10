# CLAUDE.md

Context for future sessions working in this repo. Read this first.

## What devlaunch is

devlaunch turns any local dev server into a macOS app you launch from Spotlight.

A developer runs `npx devlaunch init` in a project. The tool detects the package
manager, dev script, framework, port, and Node version, then generates a small `.app`
bundle in `~/Applications`. Typing the project name in Spotlight starts the dev
server and opens the browser once the port is ready.

**Audiences**

- Developers who want to stop opening an IDE or terminal just to run a dev server.
- Non-technical teammates (designers, PMs, QA) who need the app running locally.
- Maintainers / eng leads who want one-line onboarding for their repo.

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

## Non-negotiable product principles

- **No system modification from `npm install`.** No `postinstall` / lifecycle hooks,
  no native modules. Installing the package must never change the user's machine.
- **No silent failures.** Every failure an end user can hit produces a native macOS
  dialog with an action to take — never a silent exit, never a bare stack trace.
- **Generated launchers carry no secrets.** They contain only absolute paths on the
  user's own machine. Nothing machine-specific is ever written into a user's repo or
  committed.
- **Non-macOS exits cleanly.** On any non-macOS platform the CLI prints a friendly
  message and exits 0-ish without crashing.
- **Adoption is reversible.** Every change the tool makes to the system has a
  documented undo command (`devlaunch remove`).

## Conventions

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, …).
- **Changesets** for every user-facing change: `pnpm changeset`, select `devlaunch`.
  `core` / `runtime` / `site` are in the changeset `ignore` list.
- **Tests are required for detection logic.** Any code in `packages/core` that infers
  something about a project ships with unit tests covering the fixture shapes in
  `examples/`.
- Keep the `core` / `cli` boundary strict: if you find yourself importing `node:fs`
  prompts or writing to stdout inside `core`, move it to `cli`.

## Status

Scaffold only. `core.detectProject`, the `cli` commands, and the `runtime` templates
are placeholders with `NOT_IMPLEMENTED` / TODO markers. The public `README.md`,
`marketing/messaging.md`, and real site content are later sessions.
