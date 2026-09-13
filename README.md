# Jeleboo — Deploy Notes

Everything below is guidance for the people (or your own future self) who run
Jeleboo. The planned shape is a two-host split — frontend on Vercel, backend on
a persistent-process host — per `architecture.md`'s Deployment fork.

## Repository layout

- `app/` — Vite + React + TypeScript PWA (frontend). Deploys to Vercel.
- `server/` — Bun + Express + TypeScript backend. Deploys to a persistent host
  (Railway by default for v1). SQLite via `bun:sqlite`; the poll job calls WAQI,
  evaluates thresholds with hysteresis, and dispatches Web Push.
- Planning files (`project-brief.md`, `architecture.md`, `design.md`,
  `build-blueprint.md`, `build-status.md`, `work-cards/*`) are the source of
  truth for how and why the app is built.

## Frontend — Vercel

1. Import the GitHub repo; set **Root Directory** to `app`.
2. Build command `bun run build`; output directory `dist`.
3. Environment variables:
   - `VITE_VAPID_PUBLIC_KEY` — the Web Push application server public key
     (must match the backend's VAPID pair).
   - `VITE_BACKEND_URL` — the deployed backend's base URL, without a trailing
     slash (e.g. `https://jeleboo.up.railway.app`). Set this **after** the
     backend is deployed, then redeploy.
4. `vercel.json` at the repo root pins the `sin1` region and enables cleanUrls.

## Backend — Railway (or any persistent Bun host)

The serveable unit is the **`server/`** directory. This host must keep a
long-running process and a writable volume alive between requests — a free-tier
serverless or sleeping host will not work (it would stall the poll job).

1. Create a project → deploy the GitHub repo → set **Root Directory** to
   `server`. Railway will use the `Dockerfile` (official `oven/bun` image).
2. Add a **volume** (e.g. mounted at `/data`) so the SQLite file persists.
3. Environment variables (all required unless marked):
   - `DATABASE_PATH=/data/jeleboo.sqlite` — must point into the volume!
   - `WAQI_TOKEN` — from `server/.env.local` (never commit it).
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — VAPID pair +
     `mailto:` subject from `server/.env.local`.
   - `PORT` — Railway injects this automatically; the app falls back to 3000.
   - `POLL_INTERVAL_MINUTES=20` — starts the in-process poll scheduler
     (optional; without it, run `POST /api/jobs/poll/run` yourself).
4. Smoke test **directly against the backend** before wiring the frontend:
   - `GET /health` → `{"status":"ok"}`
   - `GET /api/reading?lat=3.139&lng=101.6869` → a real AQI reading
5. Wire it: set `VITE_BACKEND_URL` on Vercel to this backend's URL and redeploy.

## Zero-config checks

- Secrets (WAQI token, VAPID private key) live **only** in host environment
  variables or local `.env.local` — never in committed files.
- `bun test` in `server/` covers the poll/threshold and WAQI-parser logic.
- The poll endpoint can be triggered manually:
  `curl -X POST https://<backend-url>/api/jobs/poll/run`