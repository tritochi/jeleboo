# Work Card 22 — App Icon AQI Badge

## Card Type

Feature

## Status

Done — shipped 2026-10-02 (app tests 21/21, tsc clean, build clean, CI green); builder device check pending (badge visibility needs a supporting platform; the no-op path is unit-covered)

## Why

Backlog [small] (builder QoL brainstorm, post-ship): show the current AQI as an
app-icon badge via the Badging API (`navigator.setAppBadge(aqi)`) so a glance
at the home screen answers "how bad is it right now?" without opening Jeleboo.
Platforms vary, so the card covers a graceful no-op wherever the API is
missing.

## Spec (decided here, not while building)

- New pure helper `app/src/lib/appBadge.ts`:
  `applyAppBadge(api, aqi)` where `api` is injectable (`Navigator["badge"]`-ish
  shape or null) — `setAppBadge(aqi)` when `aqi` is a finite number,
  `setAppBadge(0)`-equivalent clear when `aqi` is null, no-op when `api` is
  absent or throws (private-mode/quota quirks never break the reading flow).
- Called from the `useReading` success path with the fresh reading's AQI, and
  from the offline/error paths with `null` (badge must never outlive an
  unreadable state).
- No permission prompt work: the Badging API rides the existing notification
  permission; if the platform requires it and it's denied, the helper's
  no-op covers us.
- App badge shows a number only (no band colour anywhere outside the app).

## Done-when

- [ ] Unit tests cover: numeric badge, clear-on-null, missing API, throwing API.
- [ ] App `bun test` + `tsc --noEmit` + `vite build` clean; CI green.
- [ ] Badge visible on a supporting platform (builder device check) or the
      no-op path confirmed where unsupported.

## Don't

- Don't add a permission prompt for this — it piggybacks on the existing one.
- Don't let a badge failure throw into the reading flow.
