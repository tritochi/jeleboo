# Work Card 20 — Trust Proxy + Rate-Limit Headroom (Bugfix, post-ship)

## Card Type

Bugfix

## Status

Done (2026-09-21)

## Why

"Can't load the station map." reported by the builder on the live app. The
backend verified healthy via direct probes (both `/api/map-view` boxes
returned 200 with full data; CORS headers + preflight correct for the Vercel
origin). Root cause found in code, not network: `trust proxy` was never set,
so behind Railway's edge proxy Express reported the **proxy's** address as
`req.ip` — collapsing every per-IP limiter into **one shared global bucket
per route, for all users**. The map's settle debounce fires ~1–2 calls/sec
while actively panning/zooming, so a single user could exhaust the 30/min
map-view bucket in under a minute; every later query then 429s. On first
load `useMapView` has no cached set to fall back to, so the UI showed the
hard error card instead of stale pins.

## What (scope)

- `server.ts`: `app.set("trust proxy", 1)` — Railway terminates TLS at one
  edge hop; `req.ip` becomes the real client address and every limiter is
  now genuinely per-client.
- `routes/map-view.ts`: 30 → 60/min per client. Sustained zooming ≈ 30–60
  settles/min; repeat viewports are free (0.5°-grid cache), so this stays
  far below any upstream concern (WAQI quota: 1,000 req/sec).

## Done-when

- [x] Server `tsc` clean; `bun test` 84/84.
- [x] Deployed to Railway; live burst probe (~35 quick `/api/map-view` calls
      from one client) returns all 200 — the shared-bucket 429 is gone.
- [ ] Builder re-checks the map on a real device.