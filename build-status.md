# Build Status

## Project

- Name: Jeleboo
- Build shape: Live-Data App
- Shape confirmation: Confirmed
- Current KDBM stage: Build
- Current phase: Ready to Build
- Current work card: `work-cards/08-deploy-and-proof.md`

## Completed work cards

- [x] 00 Setup Gate — verified in this workspace (Bun 1.4.2 installed, Node v26.4.0, Git 2.55.0, identity present)
- [x] Project Brief / Identity — see `project-brief.md`
- [x] Architecture — see `architecture.md`
- [x] Design — see `design.md`; revised + tightened in workspace session: official 6-band US EPA/WAQI severity scale (Good/Moderate/Unhealthy for Sensitive Groups/Unhealthy/Very Unhealthy/Hazardous) with contrast-verified hexes, spacing scale, threshold-control style, loading/stale/offline states, per-platform install prompt, plain-language notification prompt; checklist all verified
- [x] Build Blueprint — see `build-blueprint.md`
- [x] Work Cards generated — see `work-cards/01` through `work-cards/09`
- [x] 01 Project Skeleton — scaffolded; backend `/health` returns `{"status":"ok"}`; frontend builds to `app/dist/`; no GA/AdSense IDs
- [x] 02 Backend Data Proxy — `GET /api/reading` reaches WAQI and returns a parsed reading; bad/out-of-bounds input returns 400; schema (`devices`, `readings`, `notification_log`) created; `bun test` 14/14 pass; no token hardcoded in source; live reading verified end-to-end (KL aqi 118, Kuching 173, KK 70, Ipoh 120, Langkawi 28, Seremban 107, PJ 80, Tawau 77). Fallback table expanded to all 73 WAQI Malaysian stations across 17 states/territories — every slug verified to resolve via the feed endpoint.
- [x] 03 Live Reading UI — first-screen reading card built; severity color + label, source, last-updated, monospace AQI number; `useReading` hook with geolocation, localStorage cache, loading/error/offline states; frontend builds (36 modules) and the only `fetch()` in `app/src/` hits the local backend; app shell loads with and without the backend
- [x] 04 Threshold and Storage — device/threshold/notification-log queries; server-side threshold validation (0–500); poll job with hysteresis + 300+ hazardous flag; manual `POST /api/jobs/poll/run` trigger; `ThresholdSetter` wired into `App` as a secondary control; `bun test` 29/29 pass; live poll matrix verified (KL aqi 118 crosses threshold 50 → notificationsSent 1; second run → 0 via hysteresis); threshold control present in the production bundle
- [x] 05 Push Notifications — VAPID keys live in `server/.env.local` (+ `VAPID_SUBJECT`) and `app/.env` as `VITE_VAPID_PUBLIC_KEY`; `server/src/push/vapid.ts` + `send.ts` + `routes/notify.ts` (`POST /api/notify/test`, `/api/notify/crossing`); poll job dispatches Web Push on every crossing and records dispatch failures without crashing; `NotificationPrompt` + `usePushSubscription` with plain-language copy, never re-asks after an explicit denial, persisted "push notifications on/off" toggle in the threshold section (design.md); reading route now returns `lat`/`lng` so browsers record a device location for the poll job; dev-only Vite proxy `/api` → `http://localhost:3000`; `tsc --noEmit` clean in both `app/` and `server/` (new `env.d.ts` + `bun.d.ts` references); `bun test` 31/31 (incl. new push-send tests); build passes. REAL-DEVICE VERIFICATION: passed by the builder — Android/Chrome allow + real push received; never re-asks after denial; iOS standalone path (Add to Home Screen → notifications on) confirmed.
- [x] 06 PWA Install and Offline — manifest finalized to `design.md`'s neutral chrome palette (`#FAFAF7` theme/background); real 192/512 PNG icons (`app/scripts/make-icons.ts`, no fake logo); `sw.js` cache `jeleboo-offline-v2` precaches the app shell incl. the hashed `/assets/*` bundle via a build-time Vite plugin (validated JS, no GA/AdSense); `InstallPrompt` platform-aware and secondary (Android/Chrome captures `beforeinstallprompt` → real button; iOS shows manual Share → Add to Home Screen; other platforms show nothing); offline fallback serves last-known reading. Builder confirmed browser checks: service worker active, Android native install prompt, iOS manual instructions, offline reload shows last-known reading.
- [x] 07 Review and Fix — consolidation pass: full regression of Cards 01–06 green (backend `/health` + `/api/reading` live, bad input 400, Vite/sw/manifest 200, `bun test` 31/31, app+server `tsc` clean, anti-slop + GA/AdSense scans clean). Single blocking fix applied: the Moderate band reading number + severity label rendered in bright yellow `#f9a825` (**1.97:1 FAIL** on the white card — unreadable for common AQI 51–100); changed `--sev-moderate` to the confirmed `design.md` text colour `#5d4037` (**9.32:1 PASS**). One fix only.
- [x] 09 Six-Band Severity Scale — `severity.ts` now maps the official US EPA/WAQI six bands (Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–299, Hazardous 300+) with per-band text `cssVar`s; `styles.css` gained `--sev-*-fill/-text/-accent` for all six (legacy single names retained as text colours for error/saved messages); the AQI number + badge always use the band's dark text colour (all six verified ≥ 4.5:1 on white: 7.87 / 9.32 / 5.60 / 6.57 / 11.86 / 13.02); bright yellow/amber exist only as decorative accents (grep shows no text usage); `isHazardous`/poll `HAZARDOUS_THRESHOLD` unchanged (both >= 300) so the displayed band always matches which alert fired; boundary script 11/11 correct; `bun test` 31/31; app+server `tsc` clean; build passes (40 modules, new hashes precached in `dist/sw.js`).

## In progress

- None currently — current card `work-cards/08-deploy-and-proof.md` (not started)

## Blockers

- None recorded yet

## Decisions made

- Build type: Live-Data App (PWA)
- Build shape: Live-Data App
- Stack: Bun + Express + TypeScript (backend), Vite + React + TypeScript PWA (frontend), SQLite via `bun:sqlite`
- PWA plumbing base: `augy-studios/pwa-template` (MIT), adapted — see `architecture.md`'s "PWA plumbing basis"; its Google Analytics/AdSense IDs are removed, not reused
- Data sources: WAQI (primary, v1), IQAir (secondary, later) — Malaysia only
- Design inspiration: https://designmd.ai/chef/verdana-health-design-system — calm vibe; borrow color system, whitespace, monospace numbers; skip clinical/telehealth tone
- Severity scale: official 6-band US EPA/WAQI (0–50 Good, 51–100 Moderate, 101–150 Unhealthy for Sensitive Groups, 151–200 Unhealthy, 201–299 Very Unhealthy, 300+ Hazardous), with contrast-verified fill/text hexes in `design.md` — Hazardous is 300+ to match the hardcoded critical flag (`isHazardous`/poll both use `>= 300`). The app's code still merges these into 4 bands (Good/Moderate/Unhealthy/Hazardous); that split is tracked as a backlog item promoted to `work-cards/09`.
- Planning drift-fix pass (design.md tightening): `architecture.md` and work-cards 05/06/07 aligned to the tightened design; completed cards 01/03 carry superseded notes; card Status fields corrected; every contrast ratio in `design.md` re-verified with a WCAG script; `bun test` re-run and passing after the pass
- Storage: SQLite (`bun:sqlite`), not `localStorage` — this shape allows it
- Deployment target: two-host split by default (Vercel for frontend, a persistent host for backend) — the all-Vercel/Turso alternative in `architecture.md`'s "Deployment fork" is open, not yet chosen
- Backend host during Card 08: the builder considered Supabase and **deferred it to post-v1** — v1 ships on the current Bun + Express + SQLite stack on a persistent process host (Railway/Fly/Render choice pending); Supabase migration (Postgres + Edge Functions + `pg_cron`) tracked as an Open backlog item
- Add to Home Screen: native prompt on Android, manual instructions on iOS — see `architecture.md`'s Component Map

## Last verified state

- Coding workspace: Kilo Code in VS Code (confirmed by the builder)
- File read/write access: Checked — read and edited project markdown files
- Terminal access: Checked — PowerShell commands run successfully
- Bun: Checked — 1.4.2 (was missing, installed via bun.sh/install.ps1)
- Node: Checked — v26.4.0
- Git: Checked — 2.55.0.windows.3
- Git identity: Checked — Ahmad Termizi Bin Muhammad / ahmadtermizi1994@gmail.com
- GitHub account: Checked — tritochi; repo **https://github.com/tritochi/jeleboo** (public, `main` pushed `b5a1c2b`); `gh` CLI 2.100.0 installed + authenticated (device flow); git identity matches account email
- Vercel account: Checked — signed up (GitHub OAuth via tritochi); **frontend imported** from `tritochi/jeleboo` (Root Directory `app`, build `bun run build`, output `dist`, `VITE_VAPID_PUBLIC_KEY` set); first deploy done and verified live at **https://jeleboo.vercel.app** (index.html, manifest `#FAFAF7`, sw.js with hashed precache all served correctly); `/api/reading` 404s until backend + `VITE_BACKEND_URL` wiring (Card 08 step)
- Backend host account: Checked — **Railway** (`jeleboo-production`), backend live at **https://jeleboo-production.up.railway.app**; `server/` deployed via Dockerfile (official `oven/bun`); `/health` + `/api/reading` verified live (real WAQI data); CORS allow-list middleware added and verified on the deployed host (origin `https://jeleboo.vercel.app` + `*.vercel.app`; OPTIONS preflight 204)
- Localhost: Checked — backend on :3000, Vite dev server on :5173, both running
- Live hosts: Checked — frontend **https://jeleboo.vercel.app** (verified: HTML title, manifest `#FAFAF7`, sw.js with hashed precache, deployed bundle contains `VITE_BACKEND_URL`); backend **https://jeleboo-production.up.railway.app** (verified: `/health`, `/api/reading` real AQI 142→167, CORS allow-list header + OPTIONS 204 for `https://jeleboo.vercel.app`)
- Build: Checked — frontend builds to `app/dist/` (40 modules, 156.15 kB JS / 6.10 kB CSS); dist includes manifest, sw.js (with hashed precache), icons
- Typecheck: Checked — `bunx tsc --noEmit` passes in both `app/` and `server/` (vite/client + bun-types references added); `bun test` 31/31
- Contrast: Checked — all six severity text colours on the white reading card meet ≥ 4.5:1 (Good 7.87, Moderate 9.32, USG 5.60, Unhealthy 6.57, Very Unhealthy 11.86, Hazardous 13.02); bright accents `#F9A825`/`#EF6C00` exist only as decorative fill/accents, never text
- Severity scale: Checked — six-band boundary script 11/11 (50→Good, 51/100→Moderate, 101/150→USG, 151/200→Unhealthy, 201/299→Very Unhealthy, 300/301→Hazardous)
- Live reading: Checked — real AQI end-to-end via the backend (KL 118, Kuching 173, KK 70, Ipoh 120, Langkawi 28, Seremban 107, PJ 80, Tawau 77)
- Git repo: Checked — initialized on `main`, first commit `b5a1c2b` pushed to https://github.com/tritochi/jeleboo (public); secret scan clean (no `.env*`, `*.sqlite`, `node_modules/`, `dist/`, dev logs tracked)
- Manual poll trigger: Checked **after a found gap** — `POST /api/jobs/poll/run` was documented in Cards 04/05/08 but never routed; added `server/src/routes/poll.ts`, mounted it, added env-gated `POLL_INTERVAL_MINUTES` scheduler; verified live on a test instance (`{ok:true, devicesChecked:3,...}`); `bun test` 31/31, server `tsc` clean
- Repo hygiene: Checked — `gh-auth*.log` (spent GitHub device code from the CLI login, no token) removed from tracking and gitignored; secret scan of tracked files remains clean
- WAQI token: Checked — server-side only, not hardcoded in any source file
- Third-party calls from frontend: Checked — none; the only `fetch()` in `app/src/` hits the local backend

## Next instruction for AI

Read `build-status.md`, `build-blueprint.md`, `architecture.md`, and `work-cards/08-deploy-and-proof.md`. Implement only Work Card 08. Stop after verification and update `build-status.md`. Note: GitHub / Vercel / backend-host accounts were not checked during Setup Gate — Card 08 cannot deploy until the builder provides them.
