# marketing/

Non-site launch artifacts for devlaunch: messaging, positioning, launch posts,
demo scripts, and press-kit material. The marketing **website** lives in
[`apps/site/`](../apps/site/), not here.

## Source of truth

`marketing/messaging.md` (created in a later session) is the single source of truth
for all copy — the one-liner, the positioning around the pain points devlaunch
solves, audience framing, and the words used on the site, in the README, and in
launch posts. When it exists, everything user-facing should trace back to it.

## Expected contents (added over time)

| File | Purpose |
| --- | --- |
| `messaging.md` | Canonical positioning, one-liner, audience framing, key phrases. |
| `launch/` | Draft posts (HN, Reddit, X, dev.to) and the launch checklist. |
| `scripts/` | Demo / screencast scripts. |
| `press-kit/` | Logos, screenshots, boilerplate description. |

CI builds nothing from this folder except that `site.yml` re-runs the site build
when files here change, since site copy is derived from `messaging.md`.
