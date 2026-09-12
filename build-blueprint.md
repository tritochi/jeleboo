# Build Blueprint

## Source Files

- `project-brief.md`
- `architecture.md`
- `design.md`

## Project Identity

Jeleboo — a live air-quality/haze reading and threshold-alert Progressive Web App for Malaysia.

## Build Shape

Live-Data App (PWA). Confirmed directly with the builder.

## Version-One Promise

Open the installed PWA (or a plain browser tab) and see today's real reading for your current location, sourced from a live upstream API. Set one threshold number. Get a real push notification when your tracked location crosses it.

## Scope Lock

### Now

- Malaysia only.
- One live data source wired end-to-end (WAQI / aqicn.org), resolved by geolocation.
- One global, user-set notification threshold, plus a hardcoded 300+ "hazardous" flag that fires regardless of the personal threshold.
- Installable PWA: manifest + service worker + Web Push.
- Add to Home Screen support on both platforms: native install prompt on Android/Chrome, manual step-by-step instructions on iOS Safari.
- SQLite cache of readings, plus one row per device (push subscription + threshold).

### Later

- IQAir as a second, comparable source and a "compare sources" view.
- Saved locations / watchlist beyond just live GPS.
- History / trend chart.
- Direct DOE APIMS integration, if a genuinely live feed turns out to be reachable.

### Never

- User accounts, login, or multi-user sync.
- Payments.
- Coverage outside Malaysia.
- A native app-store build.

## Architecture Summary

- **Frontend** — Vite + React + TypeScript PWA. PWA plumbing adapted from `augy-studios/pwa-template` (MIT): manifest structure, sw.js cache strategy (cache-first for static, network-first for `/api/*`), vercel.json (sin1 region), index.html meta-tag conventions. GA/AdSense IDs removed.
- **Backend** — Bun + Express + TypeScript.
- **Storage** — SQLite via `bun:sqlite`, one file on the backend host's persistent disk.
- **Push delivery** — Web Push (VAPID keys + `web-push` npm package, called from the backend).
- **Deployment** — two-host split by default (Vercel for frontend, persistent host for backend). All-Vercel/Turso alternative open, not yet chosen.

## Data / State / Storage Rules

- `devices` — push subscription IS the identity; no accounts. Columns: id, push_subscription (JSON), default_threshold, critical_alerts_enabled, created_at.
- `readings` — polling cache, one row per poll per station. Columns: id, source, station_name, lat, lng, aqi_value, scale, recorded_at.
- `notification_log` — id, device_id, threshold_value, reading_value, state, sent_at.
- Poll job runs every 15–30 minutes; upserts readings, evaluates thresholds with hysteresis (buffer 15–20), dispatches Web Push on crossing.
- WAQI/IQAir keys and VAPID keys live only as backend environment variables.

## Design Direction Summary

- **Inspiration:** https://designmd.ai/chef/verdana-health-design-system
- **Borrow:** semantic status color system across the official six US EPA / WAQI severity bands (Good → Moderate → Unhealthy for Sensitive Groups → Unhealthy → Very Unhealthy → Hazardous, exact breakpoints and hexes in `design.md` § Color / Contrast Rules); calm/whitespace ethos; monospace numerals for the AQI figure.
- **Do not copy:** clinical/telehealth tone (no appointment cards, no patient-record language); harsh neons; dense overloaded dashboards.
- **Vibe:** calm.
- **Source of truth:** `design.md` — layout rules (first-screen reading hero, spacing scale), color/contrast (≥ 4.5:1 pairs, neutral chrome `#FAFAF7` / `#1F2937`), typography (mono AQI ≥ 56px on phone), component style (threshold control, loading/stale/offline states), mobile rules (320px fit, single-column order), accessibility, and per-platform Add-to-Home-Screen + plain-language notification prompt.

## Implementation Rules

- Frontend never calls WAQI/IQAir directly — API keys and rate limits stay server-side.
- Severity color always paired with a text label; color alone never carries meaning.
- Use the official six severity bands from `design.md` § Color / Contrast Rules (Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–299, Hazardous 300+), with their exact fill/text hex pairs at ≥ 4.5:1 — the AQI number always uses the band's dark text color, never the bright accent. The Hazardous breakpoint is 300+ to match the hardcoded critical flag exactly.
- Every AQI number shown must include its source and last-updated time.
- Loading / stale / offline states per `design.md` § Component Style — never show a broken or fabricated number.
- Threshold control per `design.md` — labeled 0–500 input, Save button, inline validation, collapsed by default.
- Threshold value validated server-side before reaching the database.
- Public routes get basic rate limiting.
- No secrets or keys in code — environment variables only.
- `bun test` for threshold/hysteresis logic and response-parsing functions.
- UI-facing behavior stays on manual localhost checks.

## File and Folder Expectations

```
jeleboo/
├── app/                       # Vite + React PWA
│   ├── src/
│   │   ├── components/
│   │   │   └── InstallPrompt.tsx
│   │   └── ...
│   ├── public/                # adapted from pwa-template
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   ├── favicon.ico, icons/
│   │   ├── .well-known/assetlinks.json   # optional
│   │   └── browserconfig.xml             # optional
│   ├── index.html
│   └── package.json
├── vercel.json
├── server/                    # Bun + Express + TS
│   ├── src/
│   │   ├── routes/
│   │   ├── jobs/poll.ts
│   │   ├── db/
│   │   └── sources/
│   │       ├── waqi.ts
│   │       └── iqair.ts       # later
│   └── package.json
├── project-brief.md
├── architecture.md
├── design.md
├── build-blueprint.md
├── build-status.md
├── backlog.md
├── CHANGELOG.md
└── work-cards/
```

## Work Card Plan

Work Cards are written after this blueprint, per `prompts/05-work-card-writer.md`. Each card implements one small step and stops for verification.

## Review Mirror

- Does the build stay inside the Live-Data App guardrails?
- Are secrets kept out of code?
- Is the severity color always paired with a label, using the five band hexes from `design.md`?
- Are source and last-updated visible next to every reading?
- Are loading / stale / offline states handled per `design.md` (never a broken number)?
- Does every screen fit phone width (≥ 320px, no horizontal scroll, AQI on one line)?
- Is the iOS install/push caveat disclosed honestly in-app?

## Proof Ladder

1. `bun --version` runs.
2. Backend boots locally; a single hardcoded WAQI call round-trips to a number rendered in the frontend.
3. PWA installs on Android and iOS.
4. A real push notification fires on at least one of each platform.

## 60-Second Explanation Template

Jeleboo shows you the current, correct air quality reading for wherever you are in Malaysia, and pushes a notification the moment it crosses a threshold you set yourself.

## Guardrails for the Coding Agent

- Read `build-status.md`, `build-blueprint.md`, and the current work card before editing.
- Implement only the current work card; do not jump ahead.
- Stop after verification; update `build-status.md` after each work card.
- Stay inside the confirmed build shape's guardrails (`prompts/00-run-kdbm-coach.md`) — do not add backend/auth/database/live API/payments beyond what the shape and this blueprint explicitly allow.
- Do not add secrets or keys to code — environment variables only.
- Do not invent claims, testimonials, logos, or real numbers.
- If `architecture.md`'s Testing Strategy names something to test, write that test as part of the card that introduces the behavior.
- Apply the guardrails for the confirmed build shape.
- If a legacy file uses `Build Mode`, treat it as `Build Shape` without stopping.