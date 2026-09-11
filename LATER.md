# LATER.md

Backlog. Nothing here gets built until a prompt explicitly promotes it into the
current milestone (see the Scope rule in `CLAUDE.md`). Ordered roughly by when it's
likely to matter, not by priority — once we have real user feedback, reorder by what
people actually ask for.

- **Keychain secrets and setup assistant** (Launch 2). Promoted in L2-2.
- **Plain-language rewrite of every dialog** (Launch 2). Promoted in L2-1.
- **Automated agent evals** (Launch 2). Promoted in L2-3.
- **Multi-process launchers** — frontend + API in one app, stopping together.
- **SVG / initials icon generation** — for projects with no icon candidate.
- **Managed Node and Python runtimes** — download verified Node/uv into
  Application Support instead of relying on what's on the user's machine.
- **Python backends** — support FastAPI/Flask/Django processes, not just Node.
- **Open on my phone** — opt-in LAN sharing with a QR code page.
- **Menu bar app** — crowded territory: cmdbar, Harbr, DevDock, and others already
  exist here. Only build it if users ask, and make it clearly different (an
  extension of the per-project apps, not another dashboard to open).
- **Windows support** — a platform adapter with Start Menu shortcuts, PowerShell
  runtime, and Credential Manager.
- **"Put it online" handoff** — a path from "runs on my Mac" to a real host.
- **Importers for other tools' run configs** — VS Code tasks, other agents'
  preview configs, Procfiles — added through the `RunConfigImporter` interface
  introduced in L1-1 for `.claude/launch.json`.

When one of these gets promoted, write its prompt in the same format the others
use: goal, scope, "do not build yet", and "done when". See `docs/roadmap.md` for how
these map onto launches, and `devlaunch-claude-code-prompts-v3.md` for the full
prompt pack.
