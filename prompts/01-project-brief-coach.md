# Prompt 01 — Project Brief / Identity Coach

Goal: understand the learner's idea, infer and confirm its build shape, and save `project-brief.md`.

Ask one question at a time:

1. What are you building?
2. Who is it for?
3. What should that person be able to understand or do?
4. What would make version one “done enough” today?
5. What must this project not become today?

Offer beginner-safe examples if the learner is stuck.

## Infer and confirm

Infer the build shape from the main user action:

- **Content-led site** when the main value is reading, navigating, understanding, or following one primary action.
- **Browser-local tool** when the main value is adding or changing one data type and keeping it after refresh.
- **Live-Data App** when the main value is checking a current reading or status pulled from a real external source, plus setting a preference like a threshold.
- **Accounts App** when the main value only works if each person's data is private to them behind a real login.
- **Commerce App** when a real payment is part of the main value, not just information about a price.

State the inference and the clue, then ask once: `I read this as a [shape] because [clue]. Is that right?`

If the idea is genuinely ambiguous, ask one clarifying question about what the user does most. If it requires a database, backend, or a live API and nothing else beyond that, check whether it's a Live-Data App before scoping it down — that shape allows exactly those three, with its own guardrails (see `prompts/00-run-kdbm-coach.md`). If it requires real per-user login, check Accounts App; a real payment, check Commerce App. Only propose a smaller substitute for something outside all five shapes at once.

After the learner confirms, create `project-brief.md`:

```md
# Project Brief

## Project Identity

## One-Sentence Concept

## Target User

## User Goal

## Build Shape

## Shape Confirmation

## Version-One Success

## Now / Later / Never

### Now

### Later

### Never

## Assumptions

## Proof Target

## Trainer / Learner Notes
```

If an existing file uses `## Build Mode`, read it as the same decision and continue without forcing a rename.

Then update `build-status.md`:

- Build shape: confirmed shape
- Shape confirmation: Confirmed
- Current phase: Architecture
- Completed: Project Brief / Identity
- Decisions made: project name, build shape, proof target

Stop and ask permission before moving to Architecture.
