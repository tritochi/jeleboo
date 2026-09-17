# Work Card 19 — World Overview Display

## Card Type

Feature

## Status

Not started (blocked by Cards 17–18)

## Why

`architecture.md`'s confirmed "World overview layer" addendum + design.md's
overview bullet (2026-09-17): below zoom 4 the map is empty. This card
renders the Card 18 global layer as a visually distinct, low-fidelity layer
— and nothing else: no change to the zoom ≥ 4 viewport behavior, no "every
station" flood.

## What (scope)

- **Fetch** — `MapScreen.tsx` fetches `GET /api/world-overview` once when the
  map opens (and on Retry); cached-last-good + stale banner reuse the
  existing patterns.
- **Render** — overview markers drawn **only when zoom < 4**: ~10px circle
  dots, band fill + **no dark stroke** (visually "less precise" than the
  22px stroked live pins), same six-band palette via the existing CSS
  variables, tappable → the same fixed-order station card (label always
  paired with color).
- **Crossover** — via the existing zoom tracking: at zoom ≥ 4 the overview
  layer is removed and the live viewport markers render; at < 4 the inverse.
  The two never show simultaneously.
- **Loading/empty** — first load below zoom 4 reuses the skeleton state; if
  the overview is empty after a successful fetch, show the existing "No
  stations found here" state.

## Steps

1. design.md bullet verified (already added 2026-09-17).
2. Overview fetch hook (reuse the `useStations` fetch/stale pattern against
   the new route).
3. Zoom-gated layer rendering in `MapScreen.tsx` + simplified dot styling in
   `styles.css` (`.map-overview-dot` etc.).
4. Verify: `tsc` + `bun test` + build; localhost: world dots below zoom 4 →
   zoom in past 4 → dots swap to live viewport pins → zoom back out → dots
   return; tap a dot → station card.
5. Push → CI → Vercel; live verify against the live Railway route.

## Design check

design.md's overview bullet is the source of truth (size, no stroke, palette,
zoom cutoff). No new colors; the simplified look is the point — never
equal-precision with live pins.

## Don't

- Don't render the overview at zoom ≥ 4 or the live pins below 4.
- Don't fetch the overview on every pan/zoom (it changes per 6-hour refresh,
  not per viewport).
- Don't restyle live viewport pins.

## Done-when

- [ ] Below zoom 4: global overview dots visible and tappable; at zoom ≥ 4:
      live pins only. Crossover works both directions.
- [ ] Visual distinction obvious at a glance (smaller, stroke-less).
- [ ] `bun test` green; app `tsc` clean; build clean; CI green.
- [ ] Live on Vercel against live Railway; builder device check.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app. Test: open the map zoomed out → world
dots; zoom in on Malaysia → dots swap to live pins (incl. the full KL set);
tap a dot before zooming → card opens. Reply `continue` or `fix`.
