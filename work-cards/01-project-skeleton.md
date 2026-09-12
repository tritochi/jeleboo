# Work Card 01 — Project Skeleton

## Card Type

Feature

## Goal

Create the project scaffolding for both halves of the stack so later cards have something to build into: a Vite + React + TypeScript PWA frontend (`app/`) and a Bun + Express + TypeScript backend (`server/`), with package.json files, config, and `.gitignore` that keeps secrets out.

## Inputs

- `architecture.md` — stack, structure, deployment fork
- `build-blueprint.md` — File and Folder Expectations
- `reference/pwa-template/` — adapted starting files for PWA plumbing

## Files likely touched

- `app/package.json` (new)
- `app/tsconfig.json` (new)
- `app/vite.config.ts` (new)
- `app/index.html` (new, adapted from pwa-template)
- `app/public/manifest.json` (new, adapted from pwa-template)
- `app/public/sw.js` (new, adapted from pwa-template)
- `app/public/favicon.ico`, `app/public/icons/` (placeholders)
- `app/src/main.tsx` (new)
- `app/src/App.tsx` (new)
- `server/package.json` (new)
- `server/tsconfig.json` (new)
- `server/src/server.ts` (new)
- `server/src/index.ts` (new)
- `.gitignore` (new)
- `CHANGELOG.md` (new, initial entry)
- `build-status.md` (update)

## Instructions for the coding agent

1. Scaffold `app/` as a Vite + React + TypeScript project. Use `bun` as the package manager.
2. Scaffold `server/` as a Bun + Express + TypeScript project.
3. Adapt `reference/pwa-template/manifest.json` into `app/public/manifest.json` — keep the structure (`display_override`, `categories`, `scope`, `lang`), replace every value with Jeleboo's own. Set `theme_color`/`background_color` placeholders to be filled from `design.md`'s neutral chrome palette in Card 06 (off-white background `#FAFAF7`, calm accent — **not** the severity band colours). **Delete any Google Analytics or AdSense IDs that the template ships with.**
   > **Superseded (design.md revision, drift-fix pass):** the manifest's `theme_color`/`background_color` now come from `design.md`'s neutral chrome palette (off-white `#FAFAF7` / calm `#1F2937` accent); severity band colours are fills, not chrome. Card 06's manifest step was corrected to match. This card is completed — the note keeps history honest.
4. Adapt `reference/pwa-template/sw.js` into `app/public/sw.js` — keep the cache-first-for-static / network-first-for-`/api/*` strategy. Change the cache name and precached asset list to match Jeleboo.
5. Adapt `reference/pwa-template/index.html` into `app/index.html` — follow its meta-tag conventions (OG tags, apple-touch-icon, theme-color, manifest link, inline service-worker registration). **Delete the template's hardcoded GA and AdSense IDs.**
6. Copy `reference/pwa-template/vercel.json` to the repo root — keep the `sin1` region.
7. Create `.gitignore` covering `.env.local`, `node_modules`, `dist`, `build`, `*.sqlite`, and any generated artifacts.
8. Create `CHANGELOG.md` with a first entry: project scaffolded.
9. Add a MIT license notice comment at the top of `sw.js` and `manifest.json` noting the `augy-studios/pwa-template` origin, per `architecture.md`'s Constraints.
10. The backend's `server.ts` should start Express on a port from `PORT` env (default 3000) and expose a single `/health` route returning `{ status: "ok" }` for now. Real routes come in Card 02.
11. The frontend's `App.tsx` should render a minimal shell — a header with the app name and a single placeholder `<main>` region. Real UI comes in Card 03.

## What not to do

- Do not install packages beyond the project's own scaffolding.
- Do not create app logic, routes, or components beyond the minimal shell.
- Do not add any secrets, API keys, or VAPID keys — those are environment variables only.
- Do not initialize Git.
- Do not deploy.

## Done when

- `bun --version` runs (already verified in Setup Gate).
- The backend boots locally: `bun run dev` (or `bun src/server.ts`) in `server/` starts Express and `GET /health` returns `{ status: "ok" }`.
- The frontend builds: `bun run build` (or `npm run build`) in `app/` produces a `dist/` or `build/` output without errors.
- `.gitignore` exists and excludes `.env.local` and `*.sqlite`.
- `CHANGELOG.md` exists with a scaffold entry.
- No GA/AdSense IDs remain in `index.html`, `manifest.json`, or `sw.js`.

## Verification steps

- Run `bun --version` — must print a version.
- Start the backend and `curl http://localhost:3000/health` — must return `{"status":"ok"}`.
- Run the frontend build — must complete with no errors.
- Grep `app/index.html`, `app/public/manifest.json`, and `app/public/sw.js` for "analytics", "adsense", "UA-", "G-" — must find nothing.
- Check `.gitignore` covers `.env.local` and `*.sqlite`.

Design check: the app shell, header, and manifest follow `design.md`'s calm mood and whitespace rules; no clinical or telehealth tone appears in any shipped copy.

## Localhost test before continuing

After this card, the learner should test:

- [ ] `bun --version` prints a version.
- [ ] Backend starts and `GET /health` returns `{"status":"ok"}`.
- [ ] Frontend builds without errors.
- [ ] `.gitignore` excludes `.env.local` and `*.sqlite`.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the backend or frontend build fails after two attempts to fix config, stop and report the exact error.

## Status

Done — see `build-status.md`