# Architecture

## Build Shape

Live-Data App

## Stack Decision

- **Frontend** — Vite + React + TypeScript. The PWA plumbing (manifest, service worker, Vercel config, meta-tag conventions) starts from [augy-studios/pwa-template](https://github.com/augy-studios/pwa-template) (MIT licensed) rather than being hand-rolled — see "PWA plumbing basis" below for exactly what's kept, what's adapted, and what must be stripped before it ships.
- **Backend** — Bun + Express + TypeScript. Express runs on Bun with no real friction if you want the same server API you already know; Hono is a reasonable Bun-native alternative if you'd rather try something lighter — either works, this doc assumes Express.
- **Storage** — SQLite via Bun's built-in driver, no external dependency needed:
  ```ts
  import { Database } from "bun:sqlite";
  const db = new Database("jeleboo.sqlite");
  ```
- **Push delivery** — Web Push (VAPID keys + the `web-push` npm package, called from the backend). Works with or without installing on Android/Chrome. On iOS Safari, only works after the PWA has been added to the Home Screen — an Apple platform rule, not a design choice; the rest of the app doesn't need that step.

### PWA plumbing basis

`augy-studios/pwa-template` is a static, no-build-step template, not a React project — so it isn't dropped in wholesale. What's genuinely reused, adapted into `app/public/` and `app/index.html`:

- `manifest.json` — its structure is good and current (`display_override`, `screenshots`, `id`/`scope`/`lang`, categories). Keep the shape, replace every value with Jeleboo's own (name, icons, `theme_color`/`background_color` matching `design.md`'s neutral chrome palette (off-white background `#FAFAF7`, calm `#1F2937` accent; severity band colours are fills, not chrome), description).
- `sw.js` — genuinely well-built: cache-first for static assets and fonts, **network-first for `/api/*`** (exactly right for a live-reading app — a cached stale AQI number is worse than a real network error), offline fallback that returns a clean JSON error instead of a broken request, cached `index.html` fallback for navigation. Reuse this strategy as-is; only the cache name and the precached asset list need to change.
- `vercel.json` — minimal, and already pinned to the `sin1` (Singapore) region, which is the right region for Malaysia-facing latency. Keep it.
- The `index.html` meta-tag conventions (OG tags, apple-touch-icon, theme-color, manifest link, inline service-worker registration) are a reasonable pattern to follow — but **the template ships with a hardcoded Google Analytics ID and a hardcoded Google AdSense publisher ID belonging to its author ("Augy Studios" / "UwU Apps"). Both must be deleted, not just re-themed** — leaving them in would send Jeleboo's traffic data and any ad slots to someone else's accounts. Add Jeleboo's own analytics later if wanted; don't add AdSense at all unless the project's direction changes.
- `script.js` and the bare `<body>Template</body>` markup are not reused — that's exactly what Vite + React replaces; the template's own JS layer was intentionally left empty for whoever uses it to fill in.
- `.well-known/assetlinks.json` and `browserconfig.xml` are optional extras (Android TWA wrapping, legacy Windows tiles) — keep them staged but they're not required for the core PWA to work; fill in real values only if those specific paths get used.
- `api/template.js` shows the template's intended pattern: Vercel serverless functions under `/api/*`. This matters for the deployment fork below.

### Deployment fork — pick one before Work Card 01

The template's `api/` folder invites an all-Vercel setup, but Vercel's serverless functions don't keep a persistent SQLite file or a long-running scheduled job alive between invocations — that constraint from the original plan hasn't gone away just because the template is Vercel-flavored. Two real options:

1. **Two hosts (this doc's default so far)** — frontend on Vercel using the template's plumbing; backend (Express, the poll job, `bun:sqlite`) on a host with a persistent process — Railway, Render, Fly.io, or an existing host already in use. Simplest, lowest-risk, everything else in this doc already assumes it.
2. **One host, all-Vercel** — move the backend logic into `/api/*` serverless functions as the template suggests, and swap `bun:sqlite` for a serverless-friendly hosted database (Turso is the closest match — SQLite-compatible, generous free tier, built for exactly this). More consolidated, but it's a real architecture change, not a drop-in swap, and Vercel Cron Jobs would replace the standalone poll script.

Recommendation: start with option 1 — it's already fully speced in this document and lower-risk for a first ship. Revisit option 2 later if running two hosts becomes annoying.

## Structure Overview

```
jeleboo/
├── app/                       # Vite + React PWA
│   ├── src/
│   │   ├── components/
│   │   │   └── InstallPrompt.tsx   # Android beforeinstallprompt capture + iOS manual instructions
│   │   └── ...
│   ├── public/                # sourced from augy-studios/pwa-template, adapted per "PWA plumbing basis" above
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── favicon.ico, icons/
│   │   ├── .well-known/assetlinks.json   # optional, only if TWA-wrapped later
│   │   └── browserconfig.xml             # optional
│   ├── index.html              # template's meta-tag pattern, GA/AdSense IDs removed
│   └── package.json
├── vercel.json                 # from the template — sin1 region kept
├── server/                    # Bun + Express + TS — see "Deployment fork" for the alternative
│   ├── src/
│   │   ├── routes/            # REST endpoints the PWA calls
│   │   ├── jobs/poll.ts       # scheduled fetch + threshold check + push dispatch
│   │   ├── db/                # schema + queries, opened via bun:sqlite
│   │   └── sources/
│   │       ├── waqi.ts        # primary
│   │       └── iqair.ts       # later — comparison source
│   └── package.json
├── project-brief.md           # KDBM planning files stay at the repo root
├── architecture.md
├── design.md                  # not written yet — next phase
├── build-blueprint.md         # not written yet
├── build-status.md
├── backlog.md
├── CHANGELOG.md
└── work-cards/
```

## Component Map

- **Home** — current reading, category (Good/Moderate/Unhealthy/etc.), source label, last-updated time.
- **Threshold setting** — one number input, save.
- **InstallPrompt** — platform-aware. On Android/Chrome, captures the browser's native install prompt and offers it through Jeleboo's own button; on iOS Safari, there's no programmatic trigger at all, so it shows manual instructions (Share icon → Add to Home Screen) instead. Reference pattern:
  ```ts
  // Android/Chrome — capture the native prompt, trigger it from our own UI
  let deferredInstallPrompt: any = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // stop the browser's default mini-infobar
    deferredInstallPrompt = e;   // usable once, later, from our own button
    setShowInstallButton(true);
  });

  async function triggerAndroidInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice; // 'accepted' | 'dismissed'
    deferredInstallPrompt = null;
    setShowInstallButton(false);
  }

  window.addEventListener('appinstalled', () => setShowInstallButton(false));

  // iOS Safari — no API to trigger this; detect and show instructions instead
  const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  const showIosInstructions = isIos && !isStandalone;
  ```
- **NotificationPermission** — separate from InstallPrompt. On Android, this can be requested independently of installing — Web Push works in a plain browser tab. On iOS, the Push API doesn't exist at all until the app is running in standalone mode, so this component simply doesn't offer the notification toggle until `isStandalone` is true — it defers to InstallPrompt's iOS instructions first rather than showing a broken or silently-failing button.
- *(Later)* Compare-sources view, saved locations/watchlist, history chart.

## Data / State Model

```sql
devices                  -- a push subscription IS the identity; no accounts
  id                PK
  push_subscription -- Web Push subscription object (endpoint + keys), stored as JSON
  default_threshold
  critical_alerts_enabled  -- 300+ hazardous override, independent of the personal threshold
  created_at

readings                 -- polling cache, one row per poll per station
  id                PK
  source            -- 'waqi' | 'iqair'
  station_name
  lat, lng
  aqi_value
  scale             -- 'us_aqi' | 'malaysia_api' — these are NOT the same scale, don't conflate them
  recorded_at

notification_log
  id                PK
  device_id         FK
  threshold_value
  reading_value
  state             -- 'crossed_above' | 'cleared'
  sent_at
```

## Storage Logic

One SQLite file on the backend host's persistent disk, opened once via `bun:sqlite`. A scheduled job (every 15–30 minutes, tuned to the upstream rate limit) polls WAQI, upserts `readings`, evaluates every device's threshold against the nearest reading, writes to `notification_log`, and dispatches Web Push on a crossing — with hysteresis (don't re-fire until the reading drops back below `threshold − buffer`, default buffer 15–20) so a value sitting right at the line doesn't spam the device.

## User Flow

Open the app → browser asks for geolocation → backend resolves the nearest Malaysian reading (the frontend never calls WAQI/IQAir directly — API keys and rate limits stay server-side) → show the reading, its source, and how old it is → offer "set a threshold."

Notifications, by platform:

- **Android/Chrome** — "turn on notifications" is offered directly; installing to the home screen is a separate, optional convenience (`InstallPrompt`), not a requirement.
- **iOS Safari** — if not already running in standalone mode, show the Add to Home Screen instructions first (`InstallPrompt`'s iOS branch); only offer "turn on notifications" once the app is confirmed standalone, since the Push API doesn't exist outside it.

## File Expectations

As in Structure Overview above. Work Cards (once written) will each say exactly which of these files they touch.

## Constraints

- Malaysia only for this version.
- No third-party API key is ever shipped to the browser bundle — only the backend holds the WAQI/IQAir keys.
- WAQI's data can't be resold or put behind a paywall per their terms — a non-issue for personal/free use, worth remembering if this ever becomes a paid product.
- IQAir's free tier is 500 calls/day, city-level data only — fine as a secondary/comparison source, too thin to be the primary poll loop.
- DOE's APIMS is registered as an official open dataset (confirmed via Malaysia's MASTIC open-data catalogue), and DOE does run a formal data-request channel at `btm.doe.gov.my/permohonandata/utama` — but on inspection that channel is a research-data request process (needs an institutional supporting letter, returns historical data for completed studies, not a live feed for an app). Worth revisiting later for credibility/authority, not something to wait on now. **Both APIMS paths are now closed (2026-09-15): direct integration was tested three separate times across the project (initial architecture research, Card 15's verification pass, and a re-check that day) and confirmed non-viable via automated access every time — apims.doe.gov.my is a JavaScript app shell ("MyEQMS") with nothing extractable before a browser executes it; and the btm.doe.gov.my channel is research-data only.** WAQI remains the data source — decided, not provisionally. Recorded alongside the btm.doe.gov.my finding so both dead ends sit together instead of one looking resolved and the other looking open.
- The PWA plumbing is adapted from `augy-studios/pwa-template`, MIT licensed — free to adapt, but the MIT license text should stay noted somewhere in the repo (a `THIRD_PARTY_NOTICES.md` or a comment at the top of `sw.js`/`manifest.json` is enough) since substantial structure from it is reused. The template's own Google Analytics and AdSense IDs must not ship — see "PWA plumbing basis" above.

## Technical Non-Goals

User accounts, payments, admin dashboards, coverage outside Malaysia, a native app-store build.

## Map & Station Explorer

> Status: **confirmed by the builder (2026-09-15)** — search-based markers,
> decoupled map cache, viewing-only search in v1. Evidence below comes from
> live WAQI probes against the production token (2026-09-15).

### Map library

- **Leaflet + react-leaflet, OpenStreetMap raster tiles** — no API key, no
  billing account, attribution line required by OSM's tile policy. New app
  dependencies only: `leaflet`, `react-leaflet`, `@types/leaflet` (dev).
  Leaflet's CSS is imported by the map screen. Bundle impact ≈ +45 kB gz;
  the map screen should be lazy-loaded (`React.lazy`) so the home screen's
  first paint doesn't pay for it. Implementation note for the Work Card.

### Data source — one deviation from the assumed plan, verified live

- The assumed **WAQI `/map/bounds` endpoint is broken for Malaysia**: with the
  production token it returns `status=ok` and **zero stations** for the
  Malaysia bounding box in both coordinate orders, and the demo token errors
  on a dense European box (`status=error`). Building markers on it would ship
  an empty map — same class of upstream surprise as the missing city-feed
  coordinates (Work Card 10).
- **Replacement, verified working with the same token (no new provider,
  no new key): WAQI `/search` per Malaysian state/territory.** All 17
  states/territories returned `status=ok` with real stations (≈82 results
  total). Each result carries `uid`, live `aqi`, `station.name`,
  `station.geo` as `[lat, lon]` (verified: Kuching `1.562229, 110.388958`),
  and `station.country: "MY"`.
- This resolves the Peninsular-vs-Borneo bounding-box question by
  elimination: **no bounding boxes at all**. State keywords cannot return
  Indonesian/Bruneian/Philippine stations, and `country === "MY"` is a
  server-side guard on top. No server-side box filtering needed.

### Two new backend routes (same never-expose-the-key pattern as `/api/reading`)

- `GET /api/stations` — the merged, cached marker list: `uid`, `name`,
  `lat`, `lng`, `aqi`, `band`, `lastUpdated`. Server fetches per-state from
  WAQI `/search` (17 calls), filters `country === "MY"`, merges with the
  verified `MALAYSIA_CITY_STATIONS` table (73 stations, Card 02) for stable
  geometry/naming, and serves from cache.
- `GET /api/search?q=...` — proxies WAQI `/search` for the location
  dropdown/suggestions. Debounced client-side (~300 ms, min 2 chars),
  rate-limited server-side per Security Notes. Normalized response:
  `{ name, aqi, lat, lng, uid }`.

### Caching & freshness (why the map cache is decoupled from the poll)

- Upstream quota is not the constraint. WAQI's own terms state: "All the API
  are subjected to quota. The default quota is 1,000 (one thousand) requests
  per second" (aqicn.org/api/, checked 2026-09-15) — so even the naive
  cadence (17 calls every 20 min ≈ 1,224/day) was never a quota risk. An
  earlier draft here justified decoupling with scarcity arithmetic; that was
  wrong and is corrected.
- The real reason to decouple is **freshness need**. The personal reading
  gates a push notification, so it polls tightly (20 min). The map is
  exploratory — an hour of staleness changes nobody's decision — so markers
  are served from a cache with `MAP_CACHE_MINUTES` (default 60), refreshed
  lazily on the first map load after TTL expiry. The optional rotating
  refresher (a couple of states per poll tick — e.g. 2/tick covers the whole
  country in ~3.5 h) exists to spread the 17-call refresh instead of
  bursting it when the cache expires, not to save quota. Both new routes
  stay rate-limited as ordinary abuse protection, per Security Notes.

### Markers & severity colours

- Pin colours reuse `design.md`'s six-band palette **as-is** through the
  existing `classifyAqi` / `severity.ts` — band fill + the band's dark text
  colour for stroke/number. **No new colours.** Colour is always paired with
  the label (design.md rule): a pin tap opens the band name + number.

### Scope guard: this is a second screen, not a home-screen change

- The home screen keeps its single-reading focus. The map is reached through
  a quiet secondary affordance (tab/segmented control or a "Map" link under
  the reading card — the exact control is a design.md decision, not an
  implementation-time choice).
- **design.md needs a new section before any map UI is built**: map screen
  layout (search bar, map area, attribution placement), pin visual spec
  (fill/stroke/size, ≥44 px tap target), map loading/skeleton, offline and
  error states (sw.js is network-first for `/api/*`, so offline map =
  cached-last-good or a clean error — must be designed, not improvised),
  station popup/bottom-sheet spec, stale/empty state, and the search-selection
  behaviour — **confirmed viewing-only for v1**: selecting a result pans the
  map and shows the station; it never writes the device's threshold,
  location, or notification settings. Threshold-tied places are the
  saved-locations/watchlist item in `project-brief.md`'s Later list wearing a
  different hat — it gets its own architecture pass when actually picked up;
  do not conflate the two. Do not design the map inline while building.

### Failure honesty & testing

- `/map/bounds` broken-ness is recorded here like the Card 02 coordinate gap;
  if `/search` coverage degrades, the 73-station table still renders pins with
  last-known AQI + stale marker per design.md's stale rules.
- Server-side additions get `bun test` coverage (per-state parsing, MY filter,
  merge, cache TTL, rate limiter); UI stays on manual localhost checks per the
  existing testing strategy.

### World overview layer for zoomed-out views (PROPOSED — awaiting builder confirmation)

> Status: **proposed, not built** (2026-09-17). Narrow scope: fixes the gap
> where the map is empty below the zoom ≥ 4 guard. Explicitly **not** "load
> every WAQI station", and **no change** to the live viewport-query behavior
> at zoom ≥ 4, which stays exactly as confirmed. Note: this addendum's
> dataset findings interact with the Malaysia recheck correction above — the
> overview layer naturally includes Malaysia too, and the explore-mode
> addendum needs its own rewrite (see that correction) before either goes to
> Work Cards.

**The dataset ladder, walked and stated (2026-09-17):**

1. **City-level separately queryable?** **No.** `aqicn.org/api/` (the API
   documentation page itself) states *"Access to more than 11000
   station-level and 1000 city-level data"* — but that is intro copy in the
   JSON API section, not a documented endpoint. The documented JSON endpoints
   remain `/feed`, `/search`, and bounds ("Stations within a map lat/lng
   bounds"); there is no city-level endpoint or parameter, and "World ranking
   and trend" appears only under "will be added during the coming weeks".
2. **WAQI's public stats-page listings usable?** **No.** `/city/all/` is a
   1.49 MB single-page **link directory** (a curated "Major Cities" list plus
   per-country station links — no coordinates, AQI values are placeholders in
   the list markup); `/rankings/` is **country-level top-10** only. Neither
   yields AQI + coordinates in a machine-usable form.
3. **Path ended on (stated explicitly — a deviation from the literal ladder,
   made possible by the same-day Malaysia recheck that proved bounds works
   globally):** the **one-per-major-city heuristic applied over chunked
   `/map/bounds` data**. Chunk the world into 30°×30° cells (72 base cells),
   sub-divide any cell that returns the per-request cap (see below), and
   reduce to **one marker per normalized city name** — exactly the
   one-per-major-city heuristic this task named, but fed by the same working
   API endpoint the zoom ≥ 4 view already uses: real coordinates, live AQI,
   no HTML scraping, no hand-maintained city list to keep current.

**Real probe numbers (production token, 2026-09-17):** EU 30×30 chunk =
**1,024** stations — exactly 2^10, treated as WAQI's per-request cap, so
dense cells are sub-divided into four sub-cells recursively (max depth 2);
India/SE-Asia 30×30 = 50; US 30×30 = 370. World raw total is therefore in the
low thousands; after one-per-city dedupe the overview layer lands at an
estimated **~1,000–1,500 entries** (corroborated by WAQI's own "1,000
city-level" figure). The exact count is measured at the first full refresh
and recorded in the implementing card.

**Refresh cadence: every 6 hours** (`WORLD_OVERVIEW_HOURS` env, default 6, set
on Railway like `POLL_INTERVAL_MINUTES` + lazy client fetch of
`GET /api/world-overview` from the server's in-memory cache — same
stale-last-good pattern as `/api/stations`; disposable data, no SQLite). Why
6 hours: the task fixes this as a deliberately low-fidelity "something is
there" layer, not a live one — ≤ 6 h staleness is invisible at a zoomed-out
pin scale, and the cost is ~72 base calls + sub-divisions ≈ ~100 upstream
calls per cycle ≈ ~400/day, trivial against WAQI's documented 1,000 req/s
quota.

**Display:** rendered **only below zoom 4**; at zoom ≥ 4 the layer is dropped
and the live viewport queries take over with zero logic change. Overview
markers are visually distinct from live ones so the two never read as equally
precise: smaller (~10px dots, no dark stroke), same six-band palette, still
band+label paired and tappable into the same station card.

### Worldwide explore mode (PROPOSED — needs rewrite: premise invalidated by the Malaysia recheck, see `build-status.md`)

> Status: **proposed, not built** (2026-09-15). The bounds question the whole
> shape depends on has now been answered with a live test — see the evidence
> table. No Work Card exists yet; nothing below is confirmed.

**Scope boundary, stated explicitly:** only the *map/explore view* goes
worldwide. The core reading, threshold notifications, station resolution, and
Malaysia-focused branding/meta stay exactly as shipped — `/api/reading` still
rejects non-Malaysia coordinates, the poll/alerts pipeline is unchanged, and
no branding or meta description changes. One UI consequence is flagged: the
current "Map of Malaysian stations" button label becomes wrong under this
mode and should be renamed (e.g. "Explore stations") in any implementing card.

**The bounds test (real production token, 2026-09-15):**

| Box | Coordinate order | Result |
|---|---|---|
| US: New York / NJ metro (`40.3,-74.6,41.0,-73.5`) | A: `lat1,lng1,lat2,lng2` | **ok, 19 stations** (e.g. Maspeth, New York) |
| Europe: NW France → NRW (`48.0,2.0,52.5,7.5`) | A | **ok, 237 stations** (Picardie, France) |
| India: Delhi (`28.2,76.8,29.2,78.6`) | A | **ok, 24 stations** (Wazirpur, Delhi) |
| All three boxes above | B: reversed (`lng1,lat1,lng2,lat2`) | ok but **0 stations** — order B is silently wrong |
| EU box, **demo** token | A | **error** — the demo token carries restrictions the production token doesn't |

Conclusions: the original Card-15-era finding ("bounds broken, even a dense
EU box errors") was an artifact of the demo token; with the production token
bounds **works outside Malaysia**. Malaysia specifically still returns 0
(verified earlier with the production token in both orders) — a gap in WAQI's
bounds index, not a global breakage. That resolves the fork to the first
shape: **live viewport queries for the worldwide view, with Malaysia keeping
its search-based cached path as the known-reliable special case.**

**Proposed mechanics (Shape 1):**

- **New backend route** `GET /api/map-view?lat1,lng1,lat2,lng2` — proxies
  WAQI `/map/bounds` with the production token (same never-expose-the-key
  pattern), **coordinate order A only** (order B returns 0 silently —
  documented here and enforced server-side by always normalizing the client's
  viewport into lat1,lng1,lat2,lng2).
- **Merged response:** if the viewport intersects Malaysia, the response
  includes the existing cached 65-station MY set (from `sources/stations.ts`,
  unchanged) alongside the live-bounds results for everywhere else; markers
  deduped by uid.
- **Caching & call volume:** no schedule and no pre-population — one upstream
  call per *distinct rounded viewport* per TTL. Viewports round to a 0.5°
  grid for the cache key; TTL **60 minutes** on the same freshness-need
  grounds as `MAP_CACHE_MINUTES` (an exploratory map tolerates an hour of
  staleness; quota is not the constraint — WAQI documents 1,000 req/s).
  Cached-last-good is served stale while a refresh runs, identical to
  `stations.ts`. A typical session generates a handful of distinct viewports.
- **Guards:** bounds area cap (reject boxes wider/taller than ~30° per side —
  stops a world-zoom box returning hundreds of stations in one call); client
  only queries on pan/zoom settle (~500 ms debounce) and at zoom ≥ 4;
  `country` filter unnecessary here (bounds are inherently geographic), but
  non-MY results flow only through this read-only view. Existing 30/min/IP
  rate limiter applies.
- **project-brief.md implications (recommendation, not yet applied):** the
  Now list's "Live map of Malaysian station AQI pins…" line needs a caveat —
  proposed wording: "…plus a worldwide explore mode on the map (bounds-based;
  reading, alerts, and resolution remain Malaysia-only)". Non-Goals' "Coverage
  outside Malaysia" gets the same "(map explore view excepted)" note, or the
  two documents contradict each other.

## Testing Strategy

Automated tests for the parts that are easy to get subtly wrong and hard to eyeball: the threshold/hysteresis logic in `jobs/poll.ts`, and the WAQI/IQAir response-parsing functions in `sources/`. `bun test` covers this with no extra dependency. Everything UI-facing stays on the manual localhost checks already built into each Work Card — that's a deliberate choice for a project this size, not an oversight.

## CI/CD

A GitHub Action runs on every push: install, typecheck, `bun test`. Vercel already builds a preview deployment per pull request automatically; treat a green Action plus a working preview as the bar for merging to `main`. Backend redeploys stay manual until there's a second contributor — automate that once it stops being true.

## Environments

`.env.local` for local secrets (WAQI token, VAPID keys), never committed — `.gitignore` covers it from Work Card 01. Before pointing the deployed frontend at a new backend build, hit the backend's health/reading route directly first. A dedicated staging backend is a later-stage upgrade, not needed while there's one builder.

## Monitoring & Error Tracking

At minimum: the backend host's own logs (Railway/Render/Fly.io all keep these), plus one explicit log line whenever the poll job fails to reach an upstream source, so a silent outage doesn't go unnoticed. A free Sentry tier is worth adding once the app has real users beyond the builder's own family.

## Security Notes

WAQI/IQAir keys and VAPID keys live only as backend environment variables, never in frontend code or a committed file. Run `bun audit` periodically. Validate the threshold value server-side, not just in the form — a malformed value shouldn't be able to reach the database. Public routes (the reading endpoint especially) get basic rate limiting so one misbehaving client can't burn the day's upstream API quota for everyone.

## Versioning & Changelog

A short `CHANGELOG.md` at the repo root, one entry per shipped batch of Work Cards, in plain language ("added push notifications," "fixed threshold not saving") rather than strict semver — enough that `build-status.md` isn't the only place history lives.

## Verification Notes

`bun --version` runs. The backend boots locally and a single hardcoded WAQI call round-trips all the way to a number rendered in the frontend before any UI work starts. The PWA installs on both an Android and an iOS device, and a real push notification fires on at least one of each, before the notification feature is called "done."
