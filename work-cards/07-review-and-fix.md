# Work Card 07 — Review and Fix

## Card Type

Feature

## Goal

Run the review mirror against the built app and make the single smallest useful fix. This is a consolidation pass, not a feature pass: re-read `build-blueprint.md`'s Review Mirror and `design.md`'s Verification Checklist, check the app end to end on both platforms, and fix exactly one thing that blocks the version-one promise.

## Inputs

- `build-blueprint.md` — Review Mirror, Proof Ladder, Guardrails for the Coding Agent
- `design.md` — Design Verification Checklist, Anti-Slop Rules
- `architecture.md` — Verification Notes, Constraints
- `prompts/07-review-mirror.md` — review process

## Files likely touched

- Any file that needs the single fix (one edit, not a refactor)
- `build-status.md` (update)
- `CHANGELOG.md` (add the fix entry)

## Instructions for the coding agent

1. Read `prompts/07-review-mirror.md` and follow its review process.
2. Re-read `build-blueprint.md`'s Review Mirror and check each item:
   - Does the build stay inside the Live-Data App guardrails?
   - Are secrets kept out of code?
   - Is the severity color always paired with a label, using the six band hexes from `design.md`?
   - Are source and last-updated visible next to every reading?
   - Are loading / stale / offline states handled per `design.md` (never a broken number)?
   - Does every screen fit phone width (≥ 320px, no horizontal scroll, AQI on one line)?
   - Is the iOS install/push caveat disclosed honestly in-app?
3. Re-read `design.md`'s Design Verification Checklist and check each item:
   - First screen shows the current reading as the clear focus.
   - Severity color is paired with a label.
   - Source and last-updated are visible next to the number.
   - Threshold control is clear and secondary.
   - Loading / stale / offline states are defined.
   - Install prompt style is defined per platform.
   - Notification prompt is explained in plain language.
   - No lorem ipsum, fake testimonials, or fake stats.
4. Check the anti-slop rules: no fake logos, no fake testimonials, no fake stats, no lorem ipsum, one clear primary action, readable on phone width.
5. Run the verification steps from every prior Work Card again as a regression check:
   - Card 01 — backend `/health`, frontend build, `.gitignore`, no GA/AdSense IDs.
   - Card 02 — `/api/reading` returns a real reading; bad input returns 400; `bun test` passes; no hardcoded token.
   - Card 03 — reading card shows a real number with severity color, label, source, last-updated; geolocation denied shows a graceful fallback; ≥ 320px width is readable with no horizontal scroll; no direct third-party calls.
   - Card 04 — threshold save persists and validates server-side; malformed returns 400; `bun test` passes; poll writes `notification_log` on crossing.
   - Card 05 — VAPID private key not in repo; test push fires on Android/Chrome; iOS toggle hidden until standalone.
   - Card 06 — service worker active; install button on Android, manual instructions on iOS; offline shows last-known reading.
6. Identify the single smallest thing that blocks the version-one promise. Fix only that. Do not refactor, restructure, or add features.
7. Update `build-status.md` and add a `CHANGELOG.md` entry for the fix.

## What not to do

- Do not add new features — this is a fix pass, not a scope expansion.
- Do not refactor working code that already passes its checks.
- Do not touch the deployment setup — that is Card 08.
- Do not introduce new secrets or keys.

## Done when

- Every item on the Review Mirror passes.
- Every item on the Design Verification Checklist passes.
- All prior Work Card verification steps pass on regression.
- Exactly one fix was made (or zero, if nothing was blocking).
- `build-status.md` and `CHANGELOG.md` are updated.

## Verification steps

- Re-run the regression checks from Cards 01–06.
- Confirm the Review Mirror items all pass.
- Confirm the Design Verification Checklist items all pass.
- Confirm no anti-slop violations exist (grep for "lorem", "ipsum", fake testimonials, fake stats, placeholder logos).

Design check: the app as built matches `design.md` end to end — calm mood, whitespace, monospace numbers, severity color + label, platform-aware install prompt, plain-language notification prompt.

## Localhost test before continuing

After this card, the learner should test:

- [ ] All regression checks from Cards 01–06 pass.
- [ ] The Review Mirror items all pass.
- [ ] The Design Verification Checklist items all pass.
- [ ] No anti-slop violations remain.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If more than one thing is blocking, list them all and ask the learner which single one to fix first — do not fix them all in one pass.

## Status

Done — see `build-status.md`