# Work Card 18 — World Overview Backend

## Card Type

Feature

## Status

Not started (blocked by Cards 16–17)

## Why

`architecture.md`'s confirmed "World overview layer" addendum (2026-09-17):
below zoom 4 the map is currently empty. This card builds the low-fidelity
global layer's data side — **not** "every WAQI station", **not** a change to
the zoom ≥ 4 viewport behavior. Dataset path (confirmed): one-per-major-city
heuristic over **chunked `/map/bounds`** data — the ladder's first two rungs
were checked and rejected (city-level is not a separately-queryable endpoint
— it's intro copy on aqicn.org/api/; the stats pages are not machine-usable).

## What (scope)

- **`server/src/sources/world-overview.ts`**:
  - **Chunked world fetch** — base grid 30°×30° (72 cells covering
    lat −90..90, lng −180..180), each fetched via the bounds endpoint
    (order-A). **Cap detection**: a cell returning ≥ 1024 items (EU chunk
    measured exactly 1,024 — treated as WAQI's per-request cap) is split
    into four sub-cells, recursively, max depth 2.
  - **One-per-city dedupe** — reduce to one entry per normalized city name
    (first comma-separated token of `station.name`, lowercased/trimmed);
    the kept entry is the one with the newest `station.time`.
  - Normalization reuses Card 16's `normalizeBoundsItem` + the same
    name-suffix-unrestricted world scope (all countries kept — this is the
    worldwide layer).
  - **In-memory cache** with `fetchedAt`/`stale`; **lazy refresh** on first
    request after expiry + scheduled refresh every
    `WORLD_OVERVIEW_HOURS` (default **6**, env-gated like
    `POLL_INTERVAL_MINUTES`; only runs when set). No SQLite.
- **`server/src/routes/world-overview.ts`** — `GET /api/world-overview`:
  serves `{ stations, fetchedAt, stale, totalRaw }` (`totalRaw` = pre-dedupe
  count, recorded per the addendum). 30/min/IP limiter. Mount in `server.ts`.
- **Startup wiring** — the 6-hour scheduler runs only when
  `WORLD_OVERVIEW_HOURS` is set (Railway); local dev relies on the lazy
  first-fetch, same as the poll scheduler pattern.
- **Tests** (`server/test/world-overview.test.ts`): cap detection +
  sub-division (fake fetch returning 1024 then sub-cells), one-per-city
  dedupe rule (newest wins; city-token normalization), chunk-grid coverage
  math, TTL/stale, route shape.

## Steps

1. `sources/world-overview.ts` (chunk fetch + subdivision + dedupe + cache).
2. `routes/world-overview.ts` + `server.ts` mount + env-gated scheduler.
3. Tests; `bun test` + `tsc` green.
4. Local live check: set `WORLD_OVERVIEW_HOURS=6`, start backend, hit
   `/api/world-overview` — record the **actual entry count and `totalRaw`**
   (the addendum's estimate gets its real number here; note it in
   build-status).
5. Push → CI → Railway (add `WORLD_OVERVIEW_HOURS=6` env) → live verify.

## Design check

No UI in this card. Response contract mirrors `/api/stations` (band keys
from the server-side classifier), so Card 19's UI is a styling variation
only.

## Don't

- Don't change the zoom ≥ 4 viewport route or its behavior.
- Don't persist the overview to SQLite; don't bundle stations without the
  one-per-city dedupe (~11k entries would be the exact mistake this card
  exists to avoid).
- Don't let a chunk failure fail the whole refresh — partial sets beat none
  (log failed chunks, count them, keep previous cache).

## Done-when

- [ ] `/api/world-overview` live locally + on Railway with the deduped
      global set; `totalRaw` + entry count recorded in build-status.
- [ ] Cap subdivision proven by test; chunk failures don't break refresh.
- [ ] `bun test` green incl. new coverage; server `tsc` clean; CI green.

## Learner checkpoint (per prompts/06)

Preview: local backend or Railway URL. Test: hit `/api/world-overview` →
roughly one entry per major city (spot-check KL, London, Delhi present;
multiple Delhi-region stations reduced to one); call twice within minutes →
same `fetchedAt` (cache). Reply `continue` (→ Card 19) or `fix`.
