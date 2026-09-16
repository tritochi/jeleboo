# Work Card 13 — Quiet Hours for Notifications

## Card Type

Feature

## Status

Done — builder-verified on the live hosts (2026-09-15)

## Why

Backlog [medium] (builder QoL brainstorm, promoted 2026-09-15 as priority 1 of
3): notifications currently fire the moment a crossing is evaluated, including
overnight. Quiet hours suppress personal-threshold pushes during a device's
chosen window, with the 300+ hazardous alert explicitly bypassing it — an air
emergency must never be silenced by a bedtime setting.

## What (scope)

- **Storage** — two new `devices` columns via the existing idempotent
  migration pattern: `quiet_start_utc` / `quiet_end_utc` as INTEGER minutes
  since midnight **UTC** (0–1439), NULL = disabled. UTC is the storage format
  so the server never guesses timezones; the frontend converts the user's
  local times at save time (Malaysia is UTC+8 fixed, and the conversion uses
  the browser's current offset).
- **Pure decision logic (tested)** — exported from `jobs/poll.ts`:
  - `isWithinQuietHours(nowUtcMinutes, startUtc, endUtc): boolean` — handles
    windows that wrap midnight (e.g. 22:00→07:00); `start === end` or any
    null ⇒ false (disabled).
  - `shouldSuppressForQuietHours(reading, thresholdValue, startUtc, endUtc,
    nowUtcMinutes): boolean` — true only when the window is active AND the
    reading is below `HAZARDOUS_THRESHOLD` (300). Hazardous fires and
    hazardous clears bypass quiet hours, per the confirmed backlog wording.
- **Poll behaviour** — when a crossing/clear would dispatch and
  `shouldSuppressForQuietHours` is true: skip the push dispatch AND skip the
  `notification_log` write, count it in a new `notificationsSuppressed` field
  on `PollResult`, and log a line. Skipping the log write is deliberate
  semantics: hysteresis state stays untouched, so a crossing still active
  when quiet hours end is delivered by the next poll, and crossings that
  begin and end entirely inside the window never spam the morning.
- **API** — `PUT /api/devices/:id/quiet-hours` body
  `{ enabled: boolean, startUtcMinutes: number, endUtcMinutes: number }`,
  validated server-side (integers 0–1439, `start !== end` when enabled,
  404 for unknown device); `GET /api/devices/:id` returns the quiet fields so
  the UI can restore them.
- **Frontend** — a "Quiet hours" control inside the existing threshold
  section (design.md updated first, below the notifications toggle): enable
  checkbox + two `<input type="time">` fields (default 22:00–07:00 local),
  converted to UTC minutes on save, mirroring `ThresholdSetter`'s fetch/error/
  saved pattern. Manual test-push endpoints are unaffected (explicit user
  action always sends).

## Steps

1. `migrate.ts`: add both columns; `queries.ts`: extend `Device`, add
   `setDeviceQuietHours`.
2. `routes/quiet-hours.ts` + mount in `server.ts`; extend `GET /devices/:id`.
3. Pure logic + poll integration in `jobs/poll.ts`.
4. `bun test` coverage: window logic (in/out/wrap/disabled), suppression
   decision (personal vs hazardous), route validation helpers.
5. design.md bullet (done before this card's UI), then the frontend control.
6. Verify: `bun test` green, `tsc` clean both halves, build clean, local
   live check, push → Railway/Vercel → live verify, CI green.

## Design check

design.md's threshold/notification section gains the quiet-hours bullet
(enable toggle + two time fields, same secondary style) **before** the UI is
built. No new colors; hazardous-bypass copy stays plain-language.

## Don't

- Don't suppress hazardous (300+) dispatches — the override is the point.
- Don't change hysteresis/threshold semantics or `notification_log`'s schema.
- Don't evaluate quiet hours against server-local time — UTC minutes only.
- Don't touch `muted_until`/snooze (separate backlog item) or manual
  test-push endpoints.

## Done-when

- [x] `PUT .../quiet-hours` persists; invalid bodies → 400 (incl. zero-length
      window); unknown device → 404 — verified live.
- [x] Poll suppresses a personal crossing inside the window (counted in
      `notificationsSuppressed`, no log row, no push) and hazardous still
      fires — suppression verified live (`devicesChecked 13, suppressed 1,
      sent 0, errors []`); the hazardous bypass is covered by unit tests.
- [x] Wrap-around window (e.g. 22:00→07:00) behaves correctly — unit-tested
      boundary matrix (start inclusive, end exclusive, midnight wrap).
- [x] `bun test` green incl. new coverage (62/62); both `tsc` clean; CI green
      (`dcb794d`).
- [x] UI saves/restores quiet hours (live bundle contains the control);
      builder device check pending to close the card.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app. Test: set quiet hours spanning now →
trigger `POST /api/jobs/poll/run` → no push arrives for a personal crossing;
clear quiet hours → crossing fires again; set an artificial hazardous reading
(300+) → push arrives despite quiet hours. Reply `continue` or `fix`.
