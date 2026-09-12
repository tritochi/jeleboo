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
- DOE's APIMS is registered as an official open dataset (confirmed via Malaysia's MASTIC open-data catalogue), and DOE does run a formal data-request channel at `btm.doe.gov.my/permohonandata/utama` — but on inspection that channel is a research-data request process (needs an institutional supporting letter, returns historical data for completed studies, not a live feed for an app). Worth revisiting later for credibility/authority, not something to wait on now.
- The PWA plumbing is adapted from `augy-studios/pwa-template`, MIT licensed — free to adapt, but the MIT license text should stay noted somewhere in the repo (a `THIRD_PARTY_NOTICES.md` or a comment at the top of `sw.js`/`manifest.json` is enough) since substantial structure from it is reused. The template's own Google Analytics and AdSense IDs must not ship — see "PWA plumbing basis" above.

## Technical Non-Goals

User accounts, payments, admin dashboards, coverage outside Malaysia, a native app-store build.

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
