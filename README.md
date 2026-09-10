# devlaunch (monorepo)

> Turn any local dev server into a macOS app you launch from Spotlight.

This is the internal development README. The public-facing README is written in a
later session. For product context, boundaries, and conventions, see
[`CLAUDE.md`](./CLAUDE.md).

## Layout

```
packages/core      pure TS engine: detection, config resolution, bundle generation
packages/cli       the published `devlaunch` bin (thin layer over core)
packages/runtime   launcher templates: launcher.sh, Info.plist, run.command
apps/site          marketing site + /docs (Astro + Starlight)
examples/*          real fixture projects for e2e tests (not in the workspace)
marketing/         non-site launch artifacts; messaging.md is the copy source of truth
```

## Develop

Requires Node `>=18.20.8` (see `.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Run the CLI against a fixture:

```sh
pnpm --filter devlaunch dev -- init --cwd examples/vite-react
```

Run the site:

```sh
pnpm --filter @devlaunch/site dev
```

## Publishing

Only `packages/cli` (npm package `devlaunch`) is published, via Changesets. Add a
changeset for any user-facing change:

```sh
pnpm changeset
```

Merging the generated "Version Packages" PR publishes to npm (`release.yml`, needs
the `NPM_TOKEN` repo secret).

## Status

Scaffold only — no product logic yet. See the Status section of `CLAUDE.md`.
