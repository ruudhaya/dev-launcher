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
```
