# Work Card 21 — Worldwide Station Coverage (Feature, post-ship)

## Card Type

Feature

## Status

In progress (2026-09-27)

## Why

Builder directive (2026-09-27): "jeleboo should be able to check out every
station worldwide not just malaysia — should be every station available on
waqi api." Code review confirms three real limits behind that:

1. `/api/search` is Malaysia-only — `normalizeSearchItem`'s `country === "MY"`
   (or `malaysia/` slug) guard drops every foreign result, so `?q=tokyo` → 0.
   The map's search field even reads "Search a place in Malaysia".
2. `/api/map-view` has **no cap handling** — WAQI `/map/bounds` truncates at
   1,024 items per call (measured, Card 18), so dense viewports (Europe, US
   East, India, E. China) silently lose stations past the cap.
3. `/api/map-view` rejects any viewport **wider than 30°/side** with 400.
   Right after the overview layer hands off at zoom 4, a desktop viewport is
   60–127° wide (phone zoom 4 ≈ 34°) — those queries 400 and a cold map shows
   "Can't load the station map." instead of stations. Worldwide exploration
   only works once zoomed past ~30° (≈ zoom 5 on phone, zoom 7 on desktop).

## What (scope)

- **Worldwide suggestions** (`server/src/sources/stations.ts`,
  `routes/stations.ts`): `normalizeSearchItem` gains an options arg —
  `{ requireMy?: boolean }`, default `true` (the 17-state station set keeps
  its MY guard unchanged); the search route passes `requireMy: false`. New
  pure `buildSearchSuggestions(raw, limit = 20)`: worldwide normalize →
  drop coordinate-less rows (they cannot be flown to) → cap at 20 in WAQI
  relevance order. Response shape `{ name, aqi, lat, lng, uid }` unchanged.
- **Shared bounds primitives** (new `server/src/sources/bounds.ts`):
  `BOUNDS_CAP`, `ViewportBox`, `CHUNK_DEGREES`, `subdivide`, `collectChunk`,
  `FetchBox` move out of `world-overview.ts` (which re-exports `BOUNDS_CAP` +
  `subdivide` so its tests/public API stay identical) so `map-view.ts` can
  use the same capped-cell collector without a circular import.
- **Complete viewport fetches** (`server/src/sources/map-view.ts`):
  - `normalizeViewport`: span caps gone — structural validation only
    (finite, lat1 < lat2, lng1 < lng2); route 400 message updated to match.
  - New pure `planViewportCells(v)`: clamp lat to ±90, clamp/wrap lng to one
    world (antimeridian split into in-range segments), cut into ≤30°×30°
    cells (≤ 72 worst case — bounded upstream volume by construction).
  - `refreshMapView` fetches every cell through `collectChunk` (cell ≥ 1,024
    → four quadrants, max depth 2 — same rules as the world-overview crawl)
    via `Promise.allSettled`: partial cell failures log and degrade, every
    cell failing still throws (route keeps its 502 path). Existing MY union,
    uid dedupe, sort, 0.5°-grid cache, TTL, and stale-last-good unchanged.
- **UI** (design.md bullets updated first): search placeholder + aria-label →
  "Search a place worldwide"; dropdown gains a bounded height with internal
  scroll (20 worldwide rows must not cover the map); `MapContainer` gets
  Leaflet's `preferCanvas` so dense zoom ≥ 4 views (thousands of pins) stay
  smooth; `usePlaceSearch` comment updated.

## Steps

1. design.md bullets + architecture.md dated notes (design-first rule).
2. `bounds.ts` extraction + world-overview re-wiring (its tests stay green).
3. stations source/route worldwide search + tests.
4. map-view viewport planning/collection + tests; route 400 message.
5. App: placeholder, dropdown height, `preferCanvas`.
6. `bun test` + `tsc` both halves; app build; local live probes.
7. Commit → push → CI → Railway/Vercel live probes → closeout.

## Don't

- Don't touch `/api/stations` (retired map source, keeps its MY set),
  `/api/reading`'s Malaysia bounding box, the poll job, or push.
- Don't change the zoom gates (< 4 overview / ≥ 4 live pins) or the
  world-overview's one-per-city low-fidelity dedupe — full station fidelity
  is the zoom ≥ 4 layer's job.
- Don't add search ranking, country badges, clustering, or new colors —
  WAQI relevance order and the existing six-band styling only.
- Don't persist map data to SQLite or extend caching past the 0.5° grid + TTL.
- Don't re-validate coordinate order per cell upstream (order-A only).

## Done-when

- [ ] `?q=tokyo` / `?q=london` / `?q=paris` return worldwide suggestions
      (live, local + Railway); `?q=kuch` still returns Kuching first;
      coordinate-less rows and >20 results filtered server-side.
- [ ] A wide viewport that previously 400'd (e.g. 120°×55° box) returns 200
      with stations, locally + on Railway.
- [ ] A dense 30°×30° box returns more than the 1,024 single-call cap
      (proves sub-division) — count recorded in `build-status.md`.
- [ ] Malaysia union intact: MY box still shows all 73 table stations
      including table-only ones (e.g. Kota Tinggi).
- [ ] `?q=x` → 400; reversed/non-finite viewport → 400; every cell failed →
      502 (no silent empty success).
- [ ] design.md placeholder/search bullets updated first; architecture.md
      carries both dated notes; built bundle renders the new placeholder +
      scrollable dropdown.
- [ ] `bun test` green both halves (new coverage: planViewportCells wrap +
      clamping, cap sub-division via map-view, worldwide suggestions); `tsc
      --noEmit` clean both; app build green; CI green; live probes recorded
      in `build-status.md`.
- [ ] Builder device check: worldwide search, zoom-out at ≥ 4 with no error
      card, dense-area pins complete.