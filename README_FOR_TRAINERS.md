# Trainer Notes — KDBM Starter Pack

**Note on this copy:** this instance (Jeleboo) is a solo build outside a classroom session — there's no separate trainer, the three-hour rhythm doesn't apply, and a third build shape (Live-Data App, see `prompts/00-run-kdbm-coach.md`) has been added for projects that need a backend and a live API. This file is kept as background on where the method comes from.

KDBM means KrackedDevs Build Method. It uses one loop for beginner builds:

`Spec → Build → Check → Ship`

## Three-hour session rhythm

- 0:00–0:20 — KDBM introduction.
- 0:20–0:30 — download, unzip, rename, and open the starter.
- 0:30–0:50 — Setup Gate.
- 0:50–1:25 — coached specification and planning.
- 1:25–2:20 — Work Card implementation.
- 2:20–2:40 — Review Mirror and smallest useful fix.
- 2:40–3:00 — GitHub, Vercel, and proof.

## Build-shape rule

Do not ask learners to select a course or mode. The coach infers one of two guardrail sets and asks the learner to confirm:

- Content-led site: sections, factual content, responsive layout, and one clear primary action.
- Browser-local tool: one data type with add, update, delete, save, and refresh-persistence proof.

A dashboard is not a separate shape. Classify it by whether it presents content/sample data or manages browser-local data. For an unclear idea, allow one clarifying question. Five shapes now exist — Content-led site, Browser-local tool, Live-Data App, Accounts App, Commerce App — each with its own guardrails in `prompts/00-run-kdbm-coach.md`. A backend, database, live API, real login, or real payment is not automatically out of scope; it's a signal to classify into the matching shape and apply that shape's guardrails, not an automatic reason to shrink the idea down.

## Workspace rule

The pack is workspace-neutral. Builders may use VS Code (with Kilo Code or another AI coding extension), Antigravity, Cursor, or an equivalent AI coding workspace that can read/write files and run terminal commands.

The only progress truth is:

- `project-brief.md`
- `architecture.md`
- `design.md`
- `build-blueprint.md`
- `build-status.md`
- `backlog.md`
- `CHANGELOG.md`
- `work-cards/*.md`

If chat fails, switch model or tutor, read `build-status.md`, and continue from the current Work Card. Never reconstruct progress from chat memory.

Recommended model split:

- Planning: the strongest available model.
- Implementation: a cheaper/faster model is acceptable after the planning files are confirmed.

## Proof fallback

Aim for GitHub plus Vercel. If publishing is blocked, accept a localhost screenshot or recording plus a clear explanation of what works and what prevented publishing.
