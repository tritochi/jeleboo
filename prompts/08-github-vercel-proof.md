# Prompt 08 — GitHub + Vercel Proof

Use this only after the app/site works locally.

## GitHub push guidance

1. Confirm Git works:
   `git --version`
2. Confirm Git identity:
   `git config --global user.name`
   `git config --global user.email`
3. If identity is missing, set it:
   `git config --global user.name "Your Name"`
   `git config --global user.email "your-email@example.com"`
4. Initialize/commit:
   `git init`
   `git add .`
   `git commit -m "build: complete kdbm project"`
5. Create an empty GitHub repo. Do not add README/license/gitignore in GitHub.
6. Add remote and push:
   `git branch -M main`
   `git remote add origin <repo-url>`
   `git push -u origin main`

## Vercel deploy guidance (frontend)

1. Open Vercel.
2. Add New Project.
3. Import the GitHub repo — point it at the `app/` folder if the frontend lives in a subfolder.
4. For Vite projects:
   - Build command: `npm run build` (or `bun run build`, if that's what the project's `package.json` scripts use — match `architecture.md`)
   - Output directory: `dist`
5. Add the backend's live URL as an environment variable the frontend reads (e.g. `VITE_API_URL`), so the deployed frontend calls the deployed backend, not `localhost`.
6. Deploy.
7. Open the live URL and test the main flow again — including that a real reading loads, not a blank or error state.

## Backend deploy guidance (Live-Data App shape only)

Vercel's own serverless functions are not a good fit for this project's backend: they don't keep a persistent SQLite file or a long-running scheduled job alive between invocations. Use a host that does:

1. Pick a host that runs a persistent Bun/Node process with a writable disk for the SQLite file — Railway, Render, and Fly.io all fit; use an existing host already in use if there is one.
2. Set the upstream API keys (WAQI token, etc.) and VAPID keys as environment variables on that host — never commit them to the repo.
3. Confirm the scheduled polling job actually runs on a schedule there (a host's own cron/scheduler feature, or a lightweight `node-cron`/`Bun.serve` interval inside the process — confirm the host doesn't put the process to sleep between requests in a way that would kill the schedule).
4. Deploy, then hit the backend's own health/reading route directly (not through the frontend) to confirm it's live before wiring the frontend to it.

## Proof submission

Submit the strongest proof available:

- Strong: live Vercel URL + GitHub URL + short explanation.
- Good: GitHub URL + localhost screenshot/screen recording + short explanation.
- Minimum: localhost screenshot/screen recording + explanation of what worked and what blocked GitHub/Vercel.

If KD Showcase or event submission is active, submit the proof there using the trainer's current event instructions.

After proof is captured, update `build-status.md` with the proof used, the live/repository links when available, and `Current KDBM stage: Shipped`.
