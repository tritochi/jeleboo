# Work Card 23 — Web Share "Share This Reading"

## Card Type

Feature

## Status

Done — shipped 2026-10-02 (design.md bullet added first; app tests 24/24, tsc clean, build clean, CI green); builder device check pending (share sheet needs a supporting platform)

## Why

Backlog [small] (builder QoL brainstorm, post-ship): a Web Share API button so
sharing today's reading is one tap. Platform-aware like `InstallPrompt`: hide
the control entirely where `navigator.share` is missing rather than showing a
dead button.

## Spec (decided here, not while building)

- Design.md gets a bullet **before** any UI (design-first rule).
- A small secondary control — label **"Share this reading"** — rendered under
  the reading card's meta lines (same muted, 320px-safe styling family as the
  other secondary controls), only when `navigator.share` exists AND a fresh
  reading is on screen.
- Payload: `title: "Jeleboo — AQI {aqi}"`, `text: "AQI {aqi} ({band label}) in
  {station name} · updated {existing age phrasing} · via Jeleboo"`,
  `url: https://jeleboo.vercel.app`.
- Viewing-only: sharing never writes threshold/device state (same rule as the
  map's selection).
- Rejected share (user closes the sheet) is not an error — silently ignore.

## Done-when

- [ ] design.md bullet added first.
- [ ] Button hidden (not disabled) without `navigator.share`; visible with it.
- [ ] App tests/typecheck/build clean; CI green; live check on a supporting
      platform (builder device check).

## Don't

- Don't ship a visible-but-dead button on unsupported platforms.
- Don't re-prompt for permissions or include the threshold in the payload.
