---
"devlaunch": minor
---

Add the `devlaunch` CLI: `init`, `open`, `status`, `list`, `stop`, `logs`, `report`, `doctor`, and `uninstall`. Every command supports `--json` (a stable envelope, validated against `schemas/envelope.schema.json`), is non-interactive with `--yes` or off a TTY, and follows the exit-code contract in `docs/agent-contract.md`. `init` detects a project, resolves its config, and writes a real launcher `.app` bundle registered with Spotlight; `uninstall` is its undo.
