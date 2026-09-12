---
title: Agent contract
description: The devlaunch CLI's machine-readable contract — JSON envelope, exit codes, and non-interactive behavior.
---

devlaunch is built to be driven by a person at a terminal and by a coding agent
equally well. This page is the contract the agent skill (L1-5) and any other
tooling can rely on. It doesn't change between Launch 1 and Launch 2 — only the
human-facing layer on top of it does (see
[docs/decisions/0001-two-launches.md](decisions/0001-two-launches.md)).

## `--json`

Every command accepts `--json`. With it, **all** output goes to stdout as a single
JSON object on one line (no pretty-printing, no trailing newline noise to parse
around) matching this envelope, validated against
[`schemas/envelope.schema.json`](../schemas/envelope.schema.json):

```json
{
  "schemaVersion": 1,
  "ok": true,
  "code": "OK",
  "message": "Generated launcher \"my-app\" and registered it with Spotlight.",
  "hint": null,
  "data": { "name": "my-app", "bundlePath": "/Users/me/Applications/my-app.app" }
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | `1` | Bumped only on a breaking change to this shape. |
| `ok` | `boolean` | Whether the command succeeded. |
| `code` | `string` | `"OK"` on success. On failure, a stable code from the [error catalog](../packages/core/src/errors/catalog.ts) (e.g. `PORT_IN_USE`) — the same codes shown in dialogs and reports. |
| `message` | `string` | One human-readable sentence. Safe to print as-is. |
| `hint` | `string \| null` | What to do next. On failure, this is the catalog entry's `agentHint`. |
| `data` | `object \| null` | Command-specific payload — see each command below. Never contains secret values (redacted the same way reports are). |

Without `--json`, commands print plain, readable text to stdout (errors to stderr)
instead — same information, human formatting.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | Unexpected error (a devlaunch bug — the `DEVLAUNCH_BUG` catalog category). |
| `2` | Usage error — bad flags/arguments. Not run. |
| `3` | Needs the user — a real decision only a person can make (e.g. a `NAME_COLLISION` with no `--yes`, or a monorepo with more than one launchable app and no `--name` picking one). |
| `4` | Environment problem — the catalog's `environment` or `project-code` categories (`NODE_NOT_FOUND`, `PORT_IN_USE`, `DEPS_INSTALL_FAILED`, …). |
| `5` | Unsupported — `PLATFORM_UNSUPPORTED` (non-macOS). |

An agent can treat `0` as done, `3` as "ask the user and retry with the answer,"
and `4`/`5` as "tell the user what's wrong and stop" without inspecting `code` at
all — `code` is there for when it wants to react to a *specific* failure (e.g.
retry automatically on `DEPS_INSTALL_FAILED` after fixing the project).

## Non-interactive use

- Any command run with `--yes`, or with stdout not a TTY (piped, redirected, or
  run by an agent), never prompts. Anywhere it would have asked a question, it
  either uses the documented default or fails with exit code `3` and a `hint`
  saying which flag answers that question (e.g. "pass `--name <name>` to pick
  one of these apps").
- `--dry-run` is accepted by every command that would change the machine or the
  repo (`init`, `stop`, `uninstall`). It returns the full plan as `data` —
  exactly what would happen — and changes nothing. Combine with `--json` to get
  a machine-readable plan.
- `NO_COLOR` (or `--json`) disables ANSI color in plain-text output.
- No telemetry, ever. Nothing this CLI does calls home.

## Commands

Each command's `data` shape on success. Errors always use the envelope above
regardless of command — see the [error reference](../apps/site/src/content/docs/docs/errors.md)
for every `code` and what it means.

### `init [--cwd <dir>] [--yes] [--dry-run] [--name <name>] [--mode terminal|headless] [--json]`

Detects the project, resolves config, and writes the launcher bundle.

```json
{ "name": "my-app", "slug": "my-app", "bundlePath": "/Users/me/Applications/my-app.app", "port": 5173, "mode": "terminal", "replacingInPlace": false, "source": "heuristic" }
```

A monorepo with more than one launchable app and no `--name` exits `3` in
non-interactive mode, listing the apps in `data.apps` — pass `--name <app>` to
pick one. `--dry-run` returns the same shape without writing anything.

### `open [name] [--json]`

Opens the named launcher (or the one for the current directory's project, by
matching `DEVLAUNCH_PROJECT_DIR` in the registry, if `name` is omitted) the same
way double-clicking it does. `data`: `{ "name": "my-app" }`.

### `status [name] [--json]`

```json
{ "name": "my-app", "running": true, "pid": 4213, "port": 5173, "url": "http://localhost:5173/" }
```

### `list [--json]`

`data`: `{ "launchers": [ { "name": "my-app", "projectDir": "...", "running": false } ] }`.

### `stop [name | --all] [--dry-run] [--json]`

`data`: `{ "stopped": ["my-app"] }`.

### `logs [name] [--tail N] [--json]`

Prints the launcher's log, redacted the same way `report` is. Default `--tail 80`.
`data`: `{ "name": "my-app", "lines": ["..."] }`.

### `report [name] [--clipboard] [--json]`

Builds the same `devlaunch report v1` text a launcher's own [Copy
Report] produces (see [`buildReport`](../packages/core/src/report/build-report.ts)).
`--clipboard` copies it instead of printing it. `data`: `{ "name": "my-app", "report": "devlaunch report v1\n..." }`.

This is also what `Resources/devlaunch.mjs` inside every generated bundle runs —
the launcher script vendors this same CLI so a report can be built offline, with
no network access, even if the interactive `devlaunch` isn't on `PATH`.

### `doctor [--cwd <dir>] [--json]`

Runs a battery of checks (macOS version, Node under a login shell vs. the
current one, the project's requested Node version if run inside one, whether
`~/Applications` is indexed by Spotlight, config validity, port availability,
stale launchers/PID files) and reports each with a catalog `code` and a fix
hint. `data`: `{ "checks": [ { "name": "spotlight-indexing", "ok": true, "code": null, "hint": null } ] }`.
Exits `0` only if every check passed.

### `uninstall [name | --all] [--dry-run] [--json]`

Removes a generated launcher and its registry entry — the undo for `init`
(see the "adoption is reversible" principle in `CLAUDE.md`). `data`: `{ "removed": ["my-app"] }`.

## Not in this contract yet

`--team`, `eject`, `upgrade`, and the `skill`/`secrets` command groups are later
prompts (L1-4, L1-5, L2-2) — see `LATER.md` and the roadmap for what's deferred
and why. Adding them will extend this document, not change what's already here.
