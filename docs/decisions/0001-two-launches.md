# 0001: Two launches, developers first

## Status

Accepted.

## Context

devlaunch has two plausible audiences: developers who want their dev server to
behave like a normal Mac app, and non-developers who build web apps with AI coding
agents and just want to open what got built. Building for both at once risks
shipping neither well — the second audience needs plain language, secrets handling
with no terminal exposure, and an AI-builder-tuned skill; the first needs precise
technical output, team onboarding, and doesn't want to be talked to like a
non-developer.

## Decision

Ship developers first (Launch 1), then AI builders (Launch 2), on top of a product
people already use.

**Why developers first:**
- They're a faster feedback loop: they can install from npm, read a GitHub README,
  and file a precise bug report without any hand-holding.
- They generate the fixtures, error paths, and hardening that Launch 2 needs to be
  safe for a less technical user — by Launch 2 the rough edges are already found.
- Teams give distribution: one developer adopting devlaunch for a repo puts it in
  front of every non-technical teammate on that team, which is most of Launch 2's
  audience anyway.

**The bridge: the agent-ready contract.** Every command supports `--json`,
non-interactive use, `--dry-run`, and stable exit codes from Launch 1 onward (see
`docs/agent-contract.md`, written in L1-3). This is built for coding agents acting
on behalf of developers in Launch 1, but it's the same contract Launch 2's
AI-builder skill drives in L2-3 — nothing about the CLI's machine interface changes
between launches, only the human-facing layer on top of it (plain-language dialogs,
a different skill, a different landing page).

**What was deferred, and why:**
- Keychain secrets and the setup assistant (L2-2) — Launch 1 users manage their own
  `.env` files; secret storage only matters once devlaunch is generating apps for
  people who won't open a terminal to set an API key.
- The plain-language dialog rewrite (L2-1) — Launch 1's audience is comfortable with
  "port", "PID", and "localhost"; rewriting for a non-developer before Launch 1 ships
  would slow it down for no one's benefit yet.
- Automated agent evals (L2-3) — a manual checklist (L1-5) is enough to ship a
  developer-facing skill; the automated harness is worth building once there's a
  second, less technical skill to hold to a quality gate.
- Multi-process launchers, managed runtimes, Python backends, a menu bar app,
  Windows support, and more run-config importers — all real ideas, none of them
  blocking either launch. They live in `LATER.md` until user feedback promotes one.

## Consequences

- Launch 1's scope must stand on its own for developers; it cannot lean on Launch 2
  features to make its pitch.
- Any change to the CLI's JSON contract, exit codes, or error catalog during Launch 1
  is a decision that also shapes Launch 2 — treat contract changes as harder to walk
  back than UI copy.
- LATER.md exists specifically so good ideas raised while building Launch 1 don't
  creep into its scope or push the launch date.
