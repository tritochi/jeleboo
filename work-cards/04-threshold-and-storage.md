# Work Card 04 — Threshold and Storage

## Card Type

Feature

## Goal

Add the one user-set threshold and the per-device storage behind it: a save endpoint that validates the value server-side, a device row that holds the push subscription and threshold, and the poll job that evaluates thresholds against fresh readings with hysteresis and writes to `notification_log`. Wire the threshold-setting UI into the frontend.

## Inputs

- `architecture.md` — Data / State Model, Storage Logic, Security Notes, Testing Strategy
- `build-blueprint.md` — Data / State / Storage Rules, Implementation Rules
- `project-brief.md` — Now scope (one global threshold + hardcoded 300+ hazardous flag)
- `work-cards/02-backend-data-proxy.md` — schema and `/api/reading` route

## Files likely touched

- `server/src/routes/threshold.ts` (new)
- `server/src/routes/devices.ts` (new)
- `server/src/jobs/poll.ts` (new)
- `server/src/db/queries.ts` (update — add device and threshold queries)
- `server/src/server.ts` (update — wire new routes)
- `server/test/poll-threshold.test.ts` (new)
- `app/src/components/ThresholdSetter.tsx` (new)
- `app/src/App.tsx` (update — add threshold control)

## Instructions for the coding agent

1. Add queries to `server/src/db/queries.ts` for:
   - Upserting a device's push subscription (Card 05 wires the subscription itself; the query is needed now).
   - Getting and setting a device's `default_threshold` and `critical_alerts_enabled`.
2. Create `server/src/routes/devices.ts` exposing:
   - `POST /api/devices` — accepts a push subscription object (or a device id), stores it, returns a device id. This is the device's identity — no accounts.
   - `GET /api/devices/:id` — returns the device's threshold and critical-alerts flag.
3. Create `server/src/routes/threshold.ts` exposing:
   - `PUT /api/devices/:id/threshold` — accepts `{ threshold }`, **validates server-side** (a finite number, within a sane AQI range, e.g. 0–500), stores it, returns the saved value. A malformed value must never reach the database — return a 400.
4. Create `server/src/jobs/poll.ts` implementing the poll loop:
   - Fetch the latest reading for the tracked station(s) from WAQI (server-side token).
   - Upsert into `readings`.
   - For every device with a threshold, evaluate the reading against it.
   - Apply hysteresis: a crossing fires a notification, but don't re-fire until the reading drops back below `threshold − buffer` (buffer default 15–20). A value sitting right at the line must not spam.
   - The hardcoded 300+ "hazardous" flag fires regardless of the personal threshold when `aqi_value >= 300` and `critical_alerts_enabled` is true.
   - On each crossing, write a row to `notification_log` and dispatch Web Push (Card 05 wires the actual push; this card writes the log row and the crossing decision).
   - Log explicitly when the poll job fails to reach the upstream source, so a silent outage doesn't go unnoticed.
5. Expose a **manual trigger** endpoint (e.g. `POST /api/jobs/poll/run`) so the learner can fire the poll once locally without waiting for the schedule. The real scheduled run is a later concern.
6. Write `server/test/poll-threshold.test.ts` using `bun test` covering at least: a reading crossing above the threshold fires; a reading staying within hysteresis does not re-fire; the 300+ hazardous flag fires regardless of threshold; a malformed threshold is rejected. Per `architecture.md`'s Testing Strategy, this test is written now, as part of the card that introduces the behavior.
7. Build `app/src/components/ThresholdSetter.tsx` — a single number input with a save button, per `design.md`'s threshold-setting control style: calm, secondary to the reading, revealed on demand (progressive disclosure).
8. Wire it into `App.tsx` as a secondary action beneath the reading card.

## What not to do

- Do not validate the threshold only in the form — server-side validation is required.
- Do not let a malformed value reach the database.
- Do not dispatch real Web Push notifications yet — Card 05.
- Do not implement the scheduled loop as a real cron before the manual trigger is proven.
- Do not add user accounts or multi-user isolation — a device's push subscription is its identity.

## Done when

- Saving a threshold via the API persists it and returns the validated value.
- A malformed threshold (non-numeric, out of range) returns a 400 and writes nothing.
- The poll job, when manually triggered, evaluates thresholds against a fresh reading, writes `notification_log` rows on crossing, and applies hysteresis.
- The 300+ hazardous flag fires regardless of the personal threshold.
- `bun test` passes for the poll/threshold tests.
- The frontend shows a threshold control that saves a value.

## Verification steps

- `PUT /api/devices/:id/threshold` with a valid number — returns the saved value and the row is persisted.
- `PUT /api/devices/:id/threshold` with `"abc"` or `9999` — returns a 400, no row written.
- Run `bun test` in `server/` — the poll/threshold tests pass.
- Trigger the poll manually and confirm a `notification_log` row is written on a crossing.
- In the frontend, set a threshold and confirm it saves and is redisplayed.

Design check: the threshold control is secondary to the reading, revealed on demand, calm in tone, per `design.md`'s progressive-disclosure and anti-slop rules.

## Localhost test before continuing

After this card, the learner should test:

- [ ] Saving a valid threshold persists and is returned.
- [ ] Saving an invalid threshold returns a 400 and writes nothing.
- [ ] `bun test` passes for the poll/threshold tests.
- [ ] Manually triggering the poll writes a `notification_log` row on a crossing.
- [ ] The frontend threshold control saves and redisplay the value.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the poll job crashes on every run with the same upstream error, stop and report the raw response — do not keep retrying silently.

## Status

Done — see `build-status.md`