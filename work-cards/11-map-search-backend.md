# Work Card 11 — Map & Search Backend Data Layer

## Status

Not started

## Why

`architecture.md`'s confirmed "Map & Station Explorer" section (builder,
2026-09-15) needs two new backend routes and a cached station dataset before
the map UI (Card 12) can exist. The assumed WAQI `/map/bounds` endpoint is
**broken for Malaysia** (verified live: `status=ok` but zero stations in both
coordinate orders with the production token; the demo token errors even on a
dense European box). The verified replacement uses the **same token, no new
provider**: WAQI `/search` per Malaysian state/territory — all 17 returned
`status=ok` with real stations (≈82 results), each carrying `uid`, live
`aqi`, `station.name`, `station.geo` as `[lat, lon]` (verified: Kuching
`1.562229, 110.388958`), and `station.country: "MY"`.

## What (scope)

- **New file `server/src/sources/stations.ts`** — per-state `/search` fetch
  (17 calls), server-side `country === "MY"` guard, normalization to
  `{ uid, name, lat, lng, aqi, band, lastUpdated }`, merge with the verified
  73-station `MALAYSIA_CITY_STATIONS` table (Card 02) for stable geometry and
  naming when WAQI omits or zeroes coordinates, and an in-memory cache with a
  `MAP_CACHE_MINUTES` TTL (default **60** — decoupled from the 20-minute poll
  on freshness-need grounds, not quota; see `architecture.md`'s "Caching &
  freshness"). Refresh is lazy: the first `/api/stations` request after TTL
  expiry triggers the refresh and serves cached-last-good meanwhile. Per-state
  failures are logged and never crash the route — a partial set beats no set,
  and the response carries `fetchedAt` + `stale` so the UI can follow
  design.md's stale rules.
- **Optional rotating refresher** — spread the 17-call refresh across poll
  ticks (e.g. 2 states per tick ≈ full country in ~3.5 h) instead of bursting
  on expiry. Exists to spread load, not to save quota. If it complicates the
  first pass, lazy-only refresh is acceptable for v1.
- **`GET /api/stations`** — serves the merged cached list
  (`{ stations: [...], fetchedAt, stale }`).
- **`GET /api/search?q=...`** — proxies WAQI `/search` for the dropdown
  suggestions. Trim `q`; fewer than 2 characters → `400`. Filter to
  `country === "MY"`. Normalize to `{ name, aqi, lat, lng, uid }`.
  Rate-limited per `architecture.md`'s Security Notes (ordinary abuse
  protection — quota is not the constraint, WAQI allows 1,000 req/s).
- **Band values server-side** — markers must arrive with the same six-band
  classification the UI uses. Reuse or extract the existing six-band
  threshold logic in `server/src` (the poll job already classifies) — do not
  re-implement a second set of thresholds.
- Both routes mount in `server.ts` behind the existing global CORS
  allow-list middleware; the Vite dev proxy `/api` already covers them.

## Steps

1. Write `sources/stations.ts` (fetch, MY filter, normalize, merge, cache,
   lazy refresh) with the state keyword list derived from the existing
   17-state table — no hardcoded duplicate list.
2. Extract/reuse the six-band classifier for `band` on markers.
3. Add `routes/stations.ts` with both endpoints + validation + rate limit;
   mount in `server.ts`.
4. `bun test` coverage using the established fake-fetch test pattern:
   per-state parsing, MY filter drops non-MY results, merge fills missing
   coordinates from the Card 02 table, TTL/lazy-refresh behaviour, `q`
   validation, rate limiter.
5. Local verify with the real token: `GET /api/stations` returns ≈82
   Malaysian stations with real coordinates (KL/Kuching spot-check, no
   `0,0`); `GET /api/search?q=kuch` returns Kuching; `?q=k` → `400`.
6. `bun test` green, `bunx tsc --noEmit` clean, secret scan clean (token only
   in env).
7. Commit + push → Railway auto-redeploys → curl both routes on the live
   Railway URL and confirm real data.

## Design check

No UI in this card, but the payload is a design contract: `band` must be one
of the six band keys so Card 12 maps colors strictly through design.md's
existing palette — no color data, no hex values, no styling shipped here.

## Don't

- No bounding-box queries anywhere (resolved by elimination in
  `architecture.md`).
- No new data provider, no new API key, no `VITE_` exposure of anything.
- Don't touch `/api/reading` behaviour or the poll job.
- Don't cache in SQLite — the station set is disposable and refetchable; a
  table would be unneeded migration surface. (Revisit only if a future
  feature needs historical station data.)
- Don't silently swallow per-state fetch errors — log them.

## Done-when

- [ ] Both routes live locally and on the deployed Railway backend with real
      verified data (spot-checked stations, no zero coordinates).
- [ ] `bun test` green including the new coverage; server `tsc` clean.
- [ ] CI green on the push.
- [ ] No token in source; rate limiter active on both routes.

## Learner checkpoint (per prompts/06)

Preview: local backend on `:3000` (or the live Railway URL after push).
Test: `/api/stations` shows real Malaysian pins data (spot-check KL and
Kuching coordinates); `/api/search?q=ipoh` suggests Ipoh; `?q=a` errors
cleanly. Reply `continue` to move to Card 12, or `fix` + what you saw.