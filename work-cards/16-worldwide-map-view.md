# Work Card 16 — Worldwide Map-View Backend

## Card Type

Feature

## Status

Done — verified locally and live on Railway (see `build-status.md`); UI lands in Card 17

## Why

`architecture.md`'s CONFIRMED "Worldwide explore mode" (2026-09-17): the map
goes worldwide via live viewport queries — **Malaysia included** (recheck
proved bounds returns 57/20/7 for Malaysian boxes). Two verified facts shape
the implementation: bounds items carry **no `country`/`url` fields** (shape:
`{ lat, lon, uid, aqi, station: { name, time } }`), so the MY selection is a
**name-suffix filter** ("…, Malaysia"; Batam/Brunei excluded by construction);
and bounds covers only **65 of the 73** Card-02 table uids, so the MY portion
is a **union with the Card-02 table** — all 73 known stations stay on the map.
`/api/stations` is retired as the map's marker source (the route stays
deployed; `/api/search` and the reading pipeline are unaffected).

## What (scope)

- **`server/src/sources/map-view.ts`** — pure + cached layers:
  - `normalizeBoundsItem(raw)` → `{ uid, name, lat, lng, aqi, band, bandLabel,
    lastUpdated }` (note: top-level `lat`/`lon`, `aqi` string, `station.time`
    ISO string — a different shape from `/search`; do **not** reuse
    `normalizeSearchItem`), skipping entries without numeric aqi/name.
  - MY selection = `station.name` ends with `, Malaysia` (exact suffix,
    trimmed).
  - `unionMy(boundsMy)` = bounds-MY ∪ Card-02 table stations missing from
    bounds (table entries carry verified coordinates); when a uid matches the
    table, the table's coordinates overlay as the stable value; dedupe by
    uid.
  - In-memory cache keyed on the **0.5°-rounded viewport** (`round(v*2)/2`),
    TTL 60 min (`MAP_VIEW_CACHE_MINUTES`, default 60), lazy refresh,
    stale-last-good served while refreshing — same pattern as
    `sources/stations.ts`.
- **`server/src/routes/map-view.ts`** — `GET /api/map-view?lat1&lng1&lat2&lng2`
  (or a single comma `latlng` param): normalize into order-A numbers, reject
  non-finite / `lat1 >= lat2` / `lng1 >= lng2` / box wider or taller than
  **30° per side** with 400; 30/min/IP shared limiter; response
  `{ stations, fetchedAt, stale }` (shape matches `/api/stations` so the UI
  reuse is trivial). Mount in `server.ts`.
- **Tests** (`server/test/map-view.test.ts`): normalize (string aqi, top-level
  coords, missing fields), MY suffix filter (drops "Batam, Indonesia" and any
  hypothetical "…, Brunei" name), union coverage (all 73 table stations
  present; the 8 known-missing uids restored), table-coordinate overlay,
  0.5° rounding, area-cap and validation errors, TTL/stale behavior.

## Steps

1. `sources/map-view.ts`: normalizer, MY suffix filter, union, rounded cache.
2. `routes/map-view.ts` + mount in `server.ts`.
3. Tests as listed; `bun test` + `tsc` green.
4. Local live check (real token): `GET /api/map-view?lat1=40.3&lng1=-74.6&lat2=41.0&lng2=-73.5`
   → NY pins; KL box → all KL-area stations incl. table-only ones; oversized
   box → 400.
5. Push → CI → Railway → live verify both boxes.

## Design check

No UI in this card. Response contract: band keys from the server-side
`theme/severity.ts` classifier only — the UI maps bands to its existing CSS
variables. No color data.

## Don't

- Don't reuse `normalizeSearchItem` (different shape) or the `/search`
  country/url filter (bounds items lack those fields).
- Don't call `/map/bounds` with anything but normalized order-A numbers.
- Don't touch `/api/stations`, `/api/search`, `/api/reading`, or the poll job.
- Don't cache beyond the TTL or persist to SQLite (disposable data).

## Done-when

- [x] Route live locally + on Railway; NY box (19 stations, zero MY
      leakage) and KL box (68 stations incl. slug-fetched Perai) return
      correct merged pins. Note recorded honestly: US Embassy + Muar are
      absent when WAQI has no current reading for them (`aqi: "-"` on their
      slug feeds, verified live) — they retry on the next refresh and appear
      when data exists.
- [x] Validation 400s (bad numbers, order, >30° box); limiter active.
- [x] **Bonus bug the live check caught:** the MY union originally ran for
      every viewport — a NY box pulled all 73 Malaysian stations into
      itself. Fixed with a testable `viewportIntersectsMyBox` gate (NY/Delhi
      false, MY boxes true, inclusive edges); 3 tests added.
- [x] `bun test` 77/77 incl. new coverage; server `tsc` clean; CI green
      (`5dc6bf3`).

## Learner checkpoint (per prompts/06)

Preview: local backend or Railway URL. Test: NY box returns ~19 pins; KL box
returns the full KL set (incl. US Embassy station from the table); a
60°-wide box returns 400. Reply `continue` (→ Card 17) or `fix`.
