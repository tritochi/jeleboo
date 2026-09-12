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