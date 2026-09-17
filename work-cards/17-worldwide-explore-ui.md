# Work Card 17 — Worldwide Explore UI

## Card Type

Feature

## Status

Not started (blocked by Card 16)

## Why

The confirmed "Worldwide explore mode" needs the frontend to query viewports
instead of the fixed `/api/stations` set. design.md's worldwide bullet
(added 2026-09-17) covers the visual rules: the "Map of Malaysian stations"
button renames to **"Explore stations"**, markers come from live viewport
queries — Malaysia included — with the same six-band palette, fixed-order
station card, and unchanged states/attribution/320px/viewing-only rules.

## What (scope)

- **Button rename** — `App.tsx`: "Map of Malaysian stations" →
  "Explore stations" (single string change).
- **Viewport queries in `MapScreen.tsx`** — track the map via
  `useMapEvents(moveend/zoomend)`: on settle, debounce ~500 ms, and if
  zoom ≥ 4, fetch `GET /api/map-view` with the current viewport bounds
  (client sends `lat1,lng1,lat2,lng2` order; the server re-normalizes).
  Below zoom 4: no query (the overview layer arrives in Cards 18–19).
- **Marker rendering** — pins from the map-view response replace the
  `/api/stations` source entirely; band → CSS variable mapping unchanged
  (`--sev-<band>-fill/-text`); visual ~22px circle + invisible 44px hit
  target; tappable → same fixed-order station card.
- **States** — loading/stale/offline/empty carry over; stale uses the
  response's `fetchedAt`; the first paint before any query reuses the
  skeleton state.
- **Search** — unchanged (viewing-only, `/api/search`).

## Steps

1. design.md bullet verified (already added 2026-09-17).
2. Button rename; viewport-query hook (`useMapEvents` + debounce + zoom gate)
   as a small hook `useViewportStations`.
3. Swap the pin source; keep all existing states and the station card.
4. Verify: `tsc` + `bun test` + build; localhost: map opens on Malaysia
   (bounds query at zoom ≥ 4), pans to Europe → European pins; back to
   Malaysia → KL set incl. US Embassy; zoom < 4 → no query fires.
5. Push → CI → Vercel; live verify against the live Railway route.

## Design check

design.md's worldwide bullet is the source of truth (label, palette,
single-out rule). No new colors; no Malaysia-specific visual treatment.

## Don't

- Don't query below zoom 4 (overview layer's territory).
- Don't change `/api/search`, the search dropdown, or station-card order.
- Don't remove the `/api/stations` call path from the codebase yet — it is
  simply no longer used by the map (cleanup is a later card decision).

## Done-when

- [ ] Map shows worldwide pins on pan/zoom at zoom ≥ 4, Malaysia included;
      "Explore stations" label shipped.
- [ ] No query fires below zoom 4.
- [ ] `bun test` green; app `tsc` clean; build clean; CI green.
- [ ] Live on Vercel against live Railway; builder device check.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app. Test: open the map → pins for wherever
the viewport starts; pan to Europe → European pins appear after settle; pan
back → KL set complete; zoom out below 4 → no network call (DevTools).
Reply `continue` (→ Card 18) or `fix`.
