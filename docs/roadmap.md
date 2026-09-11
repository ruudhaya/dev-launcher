# Roadmap

devlaunch ships in two launches so the project gets into real hands early and keeps
shipping. This page is the map; `CLAUDE.md` tracks current status, and
`devlaunch-claude-code-prompts-v3.md` has the full prompt-by-prompt detail.

## Launch 1: developers and their teams

Audience: developers who want to stop opening an IDE or terminal just to run a dev
server, and the non-technical teammates (designers, PMs, QA) and eng leads who need
the app running without help. The CLI is agent-ready from day one so coding agents
can set it up too.

| Milestone | Prompts | Done when |
| --- | --- | --- |
| M1: works on my Mac | L1-1 core engine, L1-2 launcher runtime, L1-3 CLI | You launch three real projects from Spotlight daily |
| M2: team- and agent-ready | L1-4 team onboarding, L1-5 Agent Skill (developer) | A teammate onboards with one command or a double-click; Claude Code and one other agent pass the manual checklist |
| M3: a stranger can do it | L1-6 release, README, site | 0.1.0 on npm; 3 people succeed without your help |
| M4: launch | L1-7 launch kit | Posted; feedback triaged for a week |

## Launch 2: AI builders

Starts once Launch 1 has settled (launch-week bugs fixed). Audience: people who
build web apps with AI agents and aren't developers — they hit a wall of terminal
instructions at the end of a chat, don't know how to reopen the app tomorrow, and
get lost in `.env` setup.

| Prompt | Focus | Done when |
| --- | --- | --- |
| L2-1 | Plain language + "Ask AI to fix this" | Every dialog readable by a non-developer |
| L2-2 | Keychain secrets + setup assistant | API-key apps work with zero terminal use |
| L2-3 | Skill for AI builders + automated evals | Eval pass rates meet the launch gate |
| L2-4 | Messaging + landing page for AI builders | Site leads with the paste-this-sentence CTA |
| L2-5 | Launch 2 kit | Posted in AI-builder communities |

## After Launch 2

Everything else lives in `LATER.md`, ordered by what users actually ask for. The
likely candidates: managed Node/Python runtimes and Python backend support,
multi-process launchers, "open on my phone" LAN sharing, a menu bar app (only if
users ask — this space already has cmdbar, Harbr, DevDock, and others), more
run-config importers built on the `RunConfigImporter` interface, and Windows
support.

## Why this order

See `docs/decisions/0001-two-launches.md` for the reasoning: why developers first,
why the agent-ready contract is the bridge between the two launches, and what got
deferred and why.
