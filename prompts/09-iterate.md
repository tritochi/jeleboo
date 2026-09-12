# Prompt 09 — Iterate

Goal: keep the project alive after the first Ship, without letting the chat become the source of truth again.

This phase starts the first time real usage produces a bug report, a rough edge, or a new idea — which is usually within days of shipping, not months.

## The loop after Ship

`Ship → Operate → (promote one backlog item) → Build → Check → Ship → Operate → ...`

The project doesn't end at Prompt 08. It keeps looping through a smaller version of the same discipline: one card at a time, confirm before saving, test before continuing.

## Capturing new work

When the builder reports a bug, names a rough edge, or has a new idea:

1. Do not start writing code from the report directly.
2. Add a short entry to `backlog.md` instead — a sentence or two, not a full spec. Include: what's wrong or wanted, how it was noticed, and a rough size guess (small / medium / needs a Spike first).
3. Ask whether to promote it now or leave it queued. Most reports can wait; only promote immediately for something actively broken in production.

## Promoting a backlog item

1. Pick one item. Resist promoting several at once — the one-card-at-a-time discipline is what kept the initial build honest, and it applies here too.
2. Decide its Card Type: Bugfix if something that worked has broken, Spike if the right approach is genuinely unclear, Feature if it's new planned functionality.
3. Write the Work Card using `prompts/05-work-card-writer.md`'s conventions, numbered to continue the existing `work-cards/` sequence (don't restart at 01).
4. Remove or check off the item in `backlog.md` once its Work Card exists.
5. Re-enter the loop at `prompts/06-build-runner.md`.

## After each fix or feature ships again

1. Add one line to `CHANGELOG.md` in plain language — what changed, not a commit-message diff.
2. Update `build-status.md`'s "Decisions made" section if the fix changed an architecture decision (for example, switching data sources, or moving from the two-host deploy to the all-Vercel one described in `architecture.md`'s "Deployment fork").
3. If the same category of bug shows up twice, that's a signal to add or strengthen a test in `## Testing Strategy` (`architecture.md`), not just fix it twice.

## When to revisit earlier phases instead of just adding a card

Most new work is a Work Card. Go back to an earlier phase instead when:

- the request doesn't fit the confirmed Build Shape's guardrails at all (for example, Jeleboo being asked to add user logins) — that's a new shape decision, revisit `prompts/00-run-kdbm-coach.md` and treat it as a deliberate scope expansion, not a quiet one;
- the visual language itself needs to change, not just one screen — revisit `prompts/03-design-coach.md`;
- three or more backlog items all point at the same structural gap — that's an architecture conversation (`prompts/02-architecture-coach.md`), not three separate Work Cards papering over the same problem.

## Stop condition

Stop after one Work Card is written and confirmed. Do not silently promote a second backlog item in the same turn.
