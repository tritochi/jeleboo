# KDBM Starter Pack

KDBM means KrackedDevs Build Method. Use this folder to move through one durable loop:

`Spec → Build → Check → Ship`

The AI helps with speed. You still decide the goal, confirm the plan, test the result, and own what ships.

## What this pack creates

These files are the only source of truth for progress:

- `project-brief.md` — project identity, user, scope, build shape, and success target.
- `architecture.md` — stack, structure, logic, and data/storage decisions.
- `design.md` — inspiration translated into safe layout, style, mobile, and anti-slop rules.
- `build-blueprint.md` — the complete builder-ready specification.
- `build-status.md` — current phase, completed work, blockers, decisions, and next instruction.
- `work-cards/*.md` — one small implementation step at a time.

The chat is not the source of truth. The files are.

The Design phase is required. Do not create the Build Blueprint or Work Cards until `design.md` is specific about what to borrow, what not to copy, layout, components, mobile behavior, and accessibility.

## This instance: Jeleboo

This copy of the starter is already customized: `project-brief.md` and `architecture.md` are written and confirmed for **Jeleboo**, a Live-Data App (see `prompts/00-run-kdbm-coach.md` for what that shape means). Design is the next open phase. Don't re-run the Project Brief or Architecture coaches from a cold start — read the files.

## Start in your coding workspace

This project is set up for **Kilo Code in VS Code**. VS Code with another AI coding extension (Cursor, Antigravity, etc.) works the same way, as would any workspace that can read/write project files and run terminal commands.

1. Open the entire `jeleboo/` folder in VS Code with Kilo Code.
2. Open the Kilo Code chat.
3. Paste this boot prompt:

```text
Read START_HERE.md, build-status.md, project-brief.md, and architecture.md.

Project Brief and Architecture are already confirmed — don't redo those phases.

Run the Setup Gate command checks (work-cards/00-setup-gate.md) if they
haven't been run in this workspace yet, using Bun as the primary runtime
check.

Then run prompts/03-design-coach.md.

Planning phase only:
- create or update markdown planning files only
- do not create app code yet
- do not install packages yet
- do not edit project source files yet

Ask me one question at a time.
```

## How build shape works

You do not need to pre-classify your idea. Explain what you want to build. The coach will:

1. infer which of five shapes it is — content-led site, browser-local tool, Live-Data App, Accounts App, or Commerce App;
2. state what it inferred and why;
3. ask you to confirm or correct it once;
4. apply the matching scope and test guardrails.

If your idea is unclear, the coach asks one clarifying question. A backend, a database, a live API, real login, or a real payment isn't automatically out of scope — it's a signal for which of the five shapes fits, each with its own guardrails (see `prompts/00-run-kdbm-coach.md`). Jeleboo is already classified as Live-Data App.

## If your workspace cannot read files

Open `prompts/00-run-kdbm-coach.md`, copy the current phase, and paste it into the agent. After every phase, make sure the agent saves the confirmed result to the named markdown file.

## Workspace notification note

Some coding workspaces or Windows notifications show a shortened project name. Follow the checkpoint inside the agent chat, not the notification text. Use a clear folder name such as `campus-event-guide`.

## After planning is complete

You may switch to the implementation model your trainer recommends. Paste:

```text
Read build-status.md, build-blueprint.md, design.md, and the current work card listed in build-status.md.
Implement only that work card.
Run its verification steps, update build-status.md, and stop for my check.
```
