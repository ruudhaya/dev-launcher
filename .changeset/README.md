# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Only `devlaunch` (the package in `packages/cli`) is published to npm. `@devlaunch/core`
and `@devlaunch/runtime` are private and bundled into the CLI at build time, so they
are listed under `ignore` in `config.json`.

Add a changeset for every user-facing change:

```
pnpm changeset
```

Pick `devlaunch`, choose the semver bump, and describe the change in terms a user of
the CLI would understand. The release workflow opens/updates a "Version Packages" PR;
merging it publishes.
