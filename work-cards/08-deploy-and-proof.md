# Work Card 08 — Deploy and Proof

## Card Type

Feature

## Goal

Prove the version-one promise on real hosts: push the frontend to Vercel (using the template's `vercel.json`, sin1 region) and the backend to a host that keeps a persistent process and SQLite file alive (Railway, Render, Fly.io, or an existing host). Then verify end to end that a real reading appears, the PWA installs on both platforms, and a real push notification fires on at least one of each.

## Inputs

- `architecture.md` — Deployment fork, Verification Notes, Environments, CI/CD
- `project-brief.md` — Proof Target, Version-One Success
- `build-blueprint.md` — Proof Ladder
- `prompts/08-github-vercel-proof.md` — ship proof process
- `work-cards/01-project-skeleton.md` — `.gitignore`, `vercel.json`
- `work-cards/06-pwa-install-and-offline.md` — install and offline behavior

## Files likely touched

- `build-status.md` (update)
- `CHANGELOG.md` (add ship entry)
- `README.md` (new — deployment notes for the backend host)
- Backend host config (Railway/Render/Fly.io — chosen by the builder, not invented here)

## Instructions for the coding agent

1. Read `prompts/08-github-vercel-proof.md` and follow its process.
2. **Frontend — Vercel:**
   - Confirm `vercel.json` at the repo root is the adapted template version (sin1 region, cleanUrls, no GA/AdSense).
   - Deploy the `app/` frontend to Vercel via the Vercel CLI or the web dashboard, linked to this GitHub repo.
   - Confirm the deployed site serves the app shell, the manifest, and the registered service worker.
3. **Backend — persistent host:**
   - The builder picks the host (Railway, Render, Fly.io, or one already in use). Do not invent a host or a config the builder hasn't chosen.
   - Deploy `server/` so the process stays alive between requests and the SQLite file persists on disk.
   - Set the required environment variables on the host: `WAQI_TOKEN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PORT`. Never commit these.
   - Confirm `GET /health` and `GET /api/reading?lat=...&lng=...` return real data from the deployed backend.
4. **Wire the frontend to the backend:**
   - Before pointing the deployed frontend at the new backend build, hit the backend's health/reading route directly first, per `architecture.md`'s Environments.
   - Set the backend base URL in the frontend's config (environment variable, not hardcoded).
5. **End-to-end proof**, per `build-blueprint.md`'s Proof Ladder:
   - A real (not sample) reading appears end to end on the deployed frontend.
   - The PWA installs on at least one Android and one iOS device.
   - A real push notification fires on at least one of each platform.
6. Record the proof in `build-status.md` and add a `CHANGELOG.md` entry: "first ship — deployed to Vercel + backend host, real reading and push verified."

## What not to do

- Do not commit secrets, tokens, or VAPID keys — environment variables on the host only.
- Do not deploy before the regression checks from Card 07 pass.
- Do not invent a backend host or deployment config the builder hasn't chosen.
- Do not call this "done" until a real push notification has fired on at least one platform.

## Done when

- The frontend is live on Vercel and serves the app shell, manifest, and active service worker.
- The backend is live on a persistent host and `/health` plus `/api/reading` return real data.
- The deployed frontend shows a real reading sourced from the live upstream API.
- The PWA installs on Android and iOS.
- A real push notification fires on at least one of each platform.
- `build-status.md` and `CHANGELOG.md` are updated with the ship proof.

## Verification steps

- Open the deployed frontend URL — the app shell loads and shows a real AQI reading for the current location.
- Confirm the browser network tab shows calls only to the local backend, not directly to any third-party API.
- On Android/Chrome: install the PWA to the home screen and confirm it opens standalone.
- On iOS Safari: follow the in-app Add-to-Home-Screen instructions and confirm the app is added.
- Trigger a real threshold crossing (or use the manual poll + test-push endpoints) and confirm a push notification arrives on at least one Android and one iOS device.
- Grep the deployed build output for `WAQI_TOKEN`, `VAPID_PRIVATE_KEY`, or any hardcoded secret — must find nothing.

Design check: the deployed app still matches `design.md` — calm mood, whitespace, monospace numbers, severity color + label, platform-aware install prompt, plain-language notification prompt — and no fake logos, testimonials, or stats appear.

## Localhost test before continuing

After this card, the learner should test:

- [ ] The deployed frontend loads and shows a real AQI reading.
- [ ] The deployed backend `/health` and `/api/reading` return real data.
- [ ] The PWA installs on Android and opens standalone.
- [ ] The iOS Add-to-Home-Screen instructions work and the app is added.
- [ ] A real push notification fires on at least one Android and one iOS device.
- [ ] No secrets appear in the deployed build.

If all tests pass, reply `done`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the backend host is unavailable or the builder has no account, stop and report it — do not deploy to an arbitrary host without confirmation. The backend-host account was deferred in the Setup Gate on purpose.

## Status

Not started