# Project Brief

## Project Identity

Jeleboo — a live air-quality/haze reading and threshold-alert Progressive Web App for Malaysia.

## One-Sentence Concept

Jeleboo shows you the current, correct air quality reading for wherever you are in Malaysia, and pushes a notification the moment it crosses a threshold you set yourself.

## Target User

Anyone in Malaysia who currently checks two or three different haze/AQI sites and gets different numbers each time — starting with the builder and family. Particularly useful for anyone managing a respiratory condition who needs an earlier warning than a general-population alert would give.

## User Goal

Open the app, or get a push notification, and immediately know two things: is the air where I am okay right now, and has it crossed the line I personally care about.

## Build Shape

Live-Data App

## Shape Confirmation

Confirmed directly with the builder, not re-inferred from a cold start. This needs one proxied live external data source, a small backend, and a small persistent store (cached readings + one threshold per device) — exactly what the Live-Data App shape exists for. See `prompts/00-run-kdbm-coach.md` for the shape's guardrails.

## Version-One Success

Open the installed PWA — or a plain browser tab, no install required to just look something up — and see today's real reading for your current location, sourced from a live upstream API, not sample data. Set one threshold number. Get a real push notification when your tracked location crosses it.

## Now / Later / Never

### Now

- Malaysia only — no Brunei, Singapore, or other countries this version
- One live data source wired end-to-end (WAQI / aqicn.org), resolved by geolocation
- One global, user-set notification threshold, plus a hardcoded 300+ "hazardous" flag that fires regardless of the personal threshold
- Installable PWA: manifest + service worker + Web Push
- Add to Home Screen support on both platforms: a native install prompt on Android/Chrome, manual step-by-step instructions on iOS Safari (no programmatic trigger exists there — see `architecture.md`)
- SQLite cache of readings, plus one row per device (push subscription + threshold)
- Live map of Malaysian station AQI pins plus location search with dropdown
  suggestions (Leaflet + OpenStreetMap tiles, marker data from WAQI
  `/search`; confirmed in `architecture.md`'s "Map & Station Explorer" —
  search is viewing-only in v1; Work Cards 11–12)

### Later

- IQAir as a second, comparable source and a "compare sources" view (93 stations from 26 contributors for Malaysia on IQAir, including the official Department of Environment — good depth, but the free API tier is city-level only and capped at 500 calls/day, so it's a comparison source, not the primary poll loop)
- Saved locations / watchlist beyond just live GPS
- History / trend chart
- Direct DOE APIMS integration, if a genuinely live feed turns out to be reachable — see the note in `architecture.md`

### Never

- User accounts, login, or multi-user sync — a device's push subscription is its identity, nothing more
- Payments
- Coverage outside Malaysia
- A native app-store build (Expo/React Native was the original idea; PWA is the deliberate, later choice — trades a small iOS caveat for zero app-store review and one shared codebase)

## Assumptions

- PWA over a native app, per the builder's call. Caveat that matters: on iOS Safari, Web Push only works after the app has been added to the Home Screen — that's an Apple platform rule with no workaround, not a Jeleboo limitation. Looking up the current reading works in a plain browser tab regardless; only the push feature needs that one extra step, and only on iPhone.
- WAQI as the v1 source (free, generous rate limit, already republishes Malaysia DOE station data converted to US AQI). IQAir held for later given its tighter free tier. Full reasoning in `architecture.md`.
- Bun as the backend runtime; React (not Angular) on the frontend, to keep one language across both halves of the stack.

## Proof Target

Frontend (the PWA) deploys cleanly to Vercel or an equivalent static host. Backend needs a host that keeps a persistent process and an SQLite file alive between requests — Railway, Render, or Fly.io are reasonable options, or an existing host if one's already in use. GitHub push either way.

## Trainer / Learner Notes

Solo build, no separate trainer in the room. The builder is self-approving the Live-Data App shape's guardrails (backend + one proxied live API + a small database) — which is exactly what that shape is designed to allow, not an exception being smuggled past it.
