# examples/

Real fixture projects used by devlaunch's end-to-end tests. Each one is a minimal
but genuine app whose only job is to start a dev server, so the CLI has something to
detect and generate a launcher for.

**These are intentionally NOT part of the pnpm workspace.** Each fixture carries its
own lockfile and its own package manager so detection has real inputs to work with.
The e2e job installs them on demand.

| Fixture | Package manager | Exercises |
| --- | --- | --- |
| `vite-react/` | npm (`package-lock.json`, `.nvmrc`) | Vite + React, explicit port, pinned Node |
| `next-app/` | pnpm (`pnpm-lock.yaml`) | Next.js app router, framework-default port |
| `pnpm-monorepo/` | pnpm workspace (`pnpm-workspace.yaml`) | Multiple apps under `apps/`, pick one |
| `with-claude-launch-json/` | npm (`package-lock.json`) | No dev script in `package.json` — only launchable by importing `.claude/launch.json` |

### `broken/` — one failure mode each

Used by `packages/core`'s error-path tests and the runtime smoke script. Each one
is designed to fail exactly one way, deterministically, regardless of the machine
it runs on.

| Fixture | Fails how | Expected error code |
| --- | --- | --- |
| `broken/missing-dependency/` | `preinstall` script always exits 1, so `npm install` never completes | `DEPS_INSTALL_FAILED` |
| `broken/crash-on-start/` | Install succeeds; `npm run dev` exits immediately, before listening on any port | `SERVER_EXITED_EARLY` |
| `broken/wrong-port-config/` | Server starts and stays up, but listens on a different port than `launcher.port` in `package.json` | `READY_TIMEOUT` |
| `broken/node-version-mismatch/` | `.nvmrc` / `engines.node` request Node `99.99.99`, which doesn't exist | `NODE_VERSION_MISSING` |

## Running one by hand

```sh
cd examples/vite-react
npm install
npm run dev
```

## Regenerating lockfiles

```sh
# vite-react
( cd examples/vite-react && npm install --package-lock-only )

# next-app
( cd examples/next-app && pnpm install --lockfile-only )

# pnpm-monorepo
( cd examples/pnpm-monorepo && pnpm install --lockfile-only )

# broken/missing-dependency — use --ignore-scripts or the preinstall failure
# fires during lockfile generation too
( cd examples/broken/missing-dependency && npm install --package-lock-only --ignore-scripts )

# broken/crash-on-start, broken/wrong-port-config, broken/node-version-mismatch
( cd examples/broken/crash-on-start && npm install --package-lock-only )
( cd examples/broken/wrong-port-config && npm install --package-lock-only )
( cd examples/broken/node-version-mismatch && npm install --package-lock-only )

# with-claude-launch-json
( cd examples/with-claude-launch-json && npm install --package-lock-only )
```
