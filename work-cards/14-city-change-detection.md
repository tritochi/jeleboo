# Work Card 14 — City-Change Detection

## Card Type

Feature

## Status

Done — verified locally and live on Railway; hint shipped on Vercel, builder device check pending (see `build-status.md`)

## Why

Backlog [medium] (builder QoL brainstorm, promoted 2026-09-15 as priority 2
of 3): the app already re-resolves the nearest station from fresh GPS on
every open, but when that resolution lands on a *different* station than
last time — the user travelled — nothing tells them. This card surfaces the
change calmly instead of silently swapping the number.

## The "significant move" threshold, defined here (not while building)

**A significant move is a different resolved station — not a raw GPS
distance.** Station identity is already the app's resolution unit
(`station_name` drives readings, poll resolution, and the map), and with 65
stations across Malaysia a station change corresponds to roughly 10–15 km+
of travel. Computing a separate GPS-distance threshold would duplicate that
signal with worse edge cases (identical station across a distance line, and
station flips just under any distance line). The card therefore defines:
`station_changed = previous known station exists AND new resolved station
differs`. GPS coordinates still flow exactly as before.

## What (scope)

- **Frontend detection (the core)** — `useReading` compares the fresh
  reading's `station_name` against the localStorage cache read *before*
  overwrite (null-safe: first ever load is never "changed") and returns
  `station_changed` in its state.
- **UI hint** — when true, a single muted line under the reading card:
  "Location updated — now showing \<station name\>". No color coding, no
  alarm styling (design.md bullet added before building). The reading itself
  needs no user action — it is already correct.
- **Server record (small additive piece)** — `devices.last_station_name`
  column (idempotent migration); `POST /api/devices` accepts an optional
  validated `station_name` (string, trimmed, ≤ 200 chars) and stores it.
  Gives the backend a per-device city record for debugging and any future
  city-aware feature; the poll job is untouched.

## Steps

1. design.md bullet for the hint (done before the UI).
2. `migrate.ts` + `queries.ts` + `devices.ts`: last_station_name column,
   Device field, optional validated body param.
3. `useReading`: expose `station_changed`; `App.tsx`: render the hint.
4. Tests: pure `stationChanged(prevName, nextName)` helper (null-safe,
   case-exact comparison) in a new app test file; server body-validation
   edge cases in the existing devices path verified live.
5. Verify: `bun test` both halves, `tsc` both halves, build clean, live
   route check, push → CI → Railway/Vercel → live verify.

## Design check

design.md's reading-card section gains the location-update hint bullet
(single muted line, no color) **before** the UI is built. No new colors.

## Don't

- Don't add GPS-distance math or a distance constant.
- Don't touch the poll job, threshold logic, or notification semantics.
- Don't prompt, nag, or require action — the hint is informational only.
- Don't break first-load (no cache → no hint).

## Done-when

- [x] Opening the app in a new city shows the hint with the new station;
      first-ever load and same-station loads show nothing (pure helper
      unit-tested; hint verified present in the live bundle).
- [x] `POST /api/devices` stores a validated `last_station_name` — verified
      live (stored + returned in `GET /api/devices/:id`; >200 chars → 400).
- [x] `bun test` green both halves (server 62/62, app 10/10); both `tsc`
      clean; build clean; CI green (`07a23db`).
- [x] Live on Vercel/Railway; builder device check pending to close the card.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app. Test: open the app normally (no hint),
then (DevTools sensors or a real trip) change location enough to flip
stations → reopen → hint appears with the new station; refresh again in the
same place → no hint. Reply `continue` or `fix`.
