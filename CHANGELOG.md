# Changelog

All notable changes to Jeleboo are documented here, in plain language rather than strict semver.

## [Unreleased]

### Added
- Project scaffolded: Vite + React + TypeScript PWA frontend (`app/`) and Bun + Express + TypeScript backend (`server/`).
- PWA plumbing adapted from `augy-studios/pwa-template` (MIT): manifest, service worker (cache-first static / network-first `/api/*`), `vercel.json` (sin1 region), `index.html` meta-tag conventions. Template's Google Analytics and AdSense IDs removed.
- `.gitignore` covering `.env.local`, `*.sqlite`, and build artifacts.
- Backend data proxy: `GET /api/reading` resolves geolocation to the nearest Malaysian WAQI station, parses, persists, and returns the reading. SQLite schema (`devices`, `readings`, `notification_log`) via `bun:sqlite`. Per-IP rate limiting. WAQI token kept server-side only.
- WAQI response parser with `bun test` coverage (14 tests).
- WAQI nearest-station fallback: the coordinate endpoint is currently unavailable
  on WAQI's side, so `GET /api/reading` tries it first and falls back to the
  nearest of 73 real Malaysian city stations by slug. Every slug verified to
  resolve via the feed endpoint before being added.
- Frontend first screen: reading card with monospace AQI number, severity colour
  paired with a text label, source, and last-updated time. `useReading` hook
  handles geolocation, loading, error, and offline states, and caches the last
  known reading in `localStorage` so a refresh or network failure never shows a
  blank screen. The frontend never calls any third-party API directly.
- Push notifications end to end: VAPID keys (env-only, never committed),
  Web Push dispatch wired into the poll job, manual test triggers
  `/api/notify/test` and `/api/notify/crossing`, a plain-language permission
  prompt that never re-asks after an explicit denial, and a persisted
  "push notifications on/off" toggle in the threshold section.
- The reading route now returns `lat`/`lng` so devices record a location for
  the poll job to resolve readings against; dev-only Vite proxy forwards `/api/*`
  to `http://localhost:3000`; `tsc --noEmit` now passes on both halves
  (`vite/client` and `bun-types` type references added).
- PWA install and offline: manifest finalized to the neutral chrome palette
  (`#FAFAF7`) with real 192/512 PNG icons; the service worker precaches the
  whole app shell — the hashed `/assets/*` bundle is injected into `dist/sw.js`
  at build time; a platform-aware "Add to Home Screen" prompt handles the native
  Android/Chrome install trigger and the iOS manual instructions.
- Fixed: the Moderate band's reading number and severity label were rendered
  in bright yellow (`#f9a825`, 1.97:1 contrast — unreadable on the white card
  for common AQI 51–100 readings); they now use the dark `#5d4037` text colour
  (9.32:1). The bright accents remain decorative-only per `design.md`.
- Severity scale: the app now shows the official six-band US EPA / WAQI scale
  (Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150,
  Unhealthy 151–200, Very Unhealthy 201–299, Hazardous 300+). Each band has its
  own fill/text/accent colours; the reading number and label use the dark
  text colour so every band is readable (≥ 4.5:1 on the card). Hazardous stays
  300+ to match the critical alert flag.
- Fixed: the manual poll trigger `POST /api/jobs/poll/run` was documented in
  Cards 04/05/08 but never actually routed — the route is now wired
  (`server/src/routes/poll.ts`) and verified live (returns `{ok:true,...}` with
  the poll result). Added an env-gated in-process scheduler
  (`POLL_INTERVAL_MINUTES`) so a persistent host like Railway can run the poll
  job without external cron.
- Deploy prep: `server/Dockerfile` + `.dockerignore` (official `oven/bun`
  image, SQLite volume at `/data`), and `README.md` with frontend/backend
  deploy notes (Vercel root `app/`; Railway root `server/`, env vars,
  DATABASE_PATH into the volume, VITE_BACKEND_URL wiring).
- Fixed: cross-origin blocking on the deployed frontend → backend split —
  added an allow-list CORS middleware to `server.ts` (default
  `https://jeleboo.vercel.app` + `*.vercel.app` previews, configurable via
  `CORS_ALLOWED_ORIGINS`). Verified locally: allowed origin gets the
  header, disallowed origin gets none, OPTIONS preflight returns 204.
- Fixed: the city-station fallback in `GET /api/reading` returned `lat: 0`
  / `lng: 0` (WAQI's city feed omits coordinates), so devices recorded a
  `0,0` location and the poll could resolve against the wrong station. The
  fallback now overlays the verified station coordinates from the
  `MALAYSIA_CITY_STATIONS` table in both the reading route and the poll
  job's resolver — verified live (KL → 3.139/101.687, Kuching → 1.562/110.389).
- **First ship — deployed and proof-passed.** Frontend live on Vercel at
  https://jeleboo.vercel.app; backend live on Railway at
  https://jeleboo-production.up.railway.app. Verified end to end: real live AQI
  reading, PWA installed on Android + iOS (Add to Home Screen), threshold
  save, and a real push notification on the live hosts. During the deploy we
  found and fixed two missing pieces: the manual poll trigger route
  (`POST /api/jobs/poll/run`) and cross-origin CORS for the Vercel→Railway
  split.
- **CI is live.** GitHub Action (`.github/workflows/ci.yml`) on every push/PR:
  `bun install --frozen-lockfile`, typecheck, and `bun test` in both `app/`
  and `server/` — the app half gets its first test file (six-band severity
  boundary suite) so the CI gate is real on both sides.
- **Station map data layer (Card 11):** new `GET /api/stations` serves a
  cached set of Malaysian AQI station markers (65 stations across all 16
  states/territories) built from WAQI `/search` per state and merged with the
  verified Card 02 coordinate table; cached for `MAP_CACHE_MINUTES` (default
  60) on freshness-need grounds, with lazy background refresh that serves
  cached-last-good (marked stale) while updating. New `GET /api/search?q=...`
  serves live place suggestions for the map dropdown, Malaysian stations only
  — a live probe caught WAQI returning Czech/Japanese results (it omits the
  `country` field on many entries), so the guard accepts `country: MY` or a
  `malaysia/...` slug. Shared per-IP rate limiter extracted
  (`lib/rate-limit.ts`); server-side six-band classifier added mirroring the
  app's (`theme/severity.ts`); corrected the station-count artifact (16 real
  states/territories, not 17 — the old test counted an `undefined` segment).
  `bun test` 49/49; CI green; both routes verified live on Railway.
- **Quiet hours (Card 13):** notifications can now be silenced overnight —
  a "Quiet hours" control in the threshold section with a from/to time
  window (stored per device in UTC, so it survives restarts and timezone
  math stays server-side). Personal-threshold pushes inside the window are
  skipped, but a crossing still active when quiet hours end is delivered by
  the next poll. **Hazardous (300+) alerts always break through.** Verified
  live: 1 crossing suppressed with quiet hours on, delivered after disabling.
- **Location-change hint (Card 14):** when you open the app somewhere that
  resolves to a different air-quality station than last time, a quiet line
  under the reading card says so — "Location updated — now showing \<station\>"
  — no alarm, no action needed (the reading was already correct). The device
  also records its last station server-side for future city-aware features.
  A significant move is defined as a *different resolved station*, not a GPS
  distance — station identity is what the app resolves against.
- **DOE guidance line (Card 15):** a small muted line under the reading card
  quotes Malaysia's **National Haze Action Plan**: outdoor activities are
  suspended above API 100, and schools close above API 200. The line always
  carries a scale caveat — DOE thresholds are on the Malaysian API scale,
  while the reading shown is US AQI. Sourced on the builder's citation
  (RTM quoting DOE's Deputy Director-General, corroborated by multiple
  outlets) after direct fetches of the official PDF were blocked; the full
  verification chain is recorded in `work-cards/15-doe-guidance-line.md`.
- **Map Screen (Card 12):** the map is live as a second screen at
  https://jeleboo.vercel.app — a quiet "Map of Malaysian stations" control
  below the reading card opens it; the ~160 kB Leaflet chunk is lazy-loaded
  so the home screen's first paint is unchanged (verified). Six-band circle
  pins (fill + dark-text stroke, 44px hit targets), debounced place search
  with AQI-labeled suggestions (viewing-only), station card in the reading
  card's fixed order, loading/stale/offline/empty states, always-visible
  OSM/WAQI attribution. One design gap found and documented first in
  design.md: the "Back to reading" control. **Builder-verified** on the live
  hosts (navigation, search, pin/label pairing, offline, 320px).
- **Card 18 — World overview backend layer:** `/api/world-overview` serves a
  low-fidelity global dataset (chunked 30°×30° `/map/bounds` grid with recursive
  sub-division on the 1,024 cap, one-per-city dedupe, 6-hour cache) rendered
  only below zoom 4 as simplified stroke-less dots. Live on Railway with real
  data from 900+ cities worldwide including Malaysia.
- **Card 19 — World overview on the map:** zoomed all the way out, the map
  now shows the world — 3,500+ one-per-city dots colored by the same six-band
  scale, tappable for a reading card. Zoom in past level 4 and the dots give
  way to the live viewport pins exactly as before; the two never mix. The
  overview refreshes on the backend every 6 hours and is cached on the
  device, so zoomed-out browsing stays cheap.
- **Fixed — map erroring under normal use:** the station map could fail with
  "Can't load the station map." because the backend counted every user
  against one shared rate-limit bucket (a hosting-proxy quirk) and the
  zoomed-in map's own query rhythm could empty it solo. Limits are now
  genuinely per-user and the map's headroom doubled; normal exploring no
  longer trips it.