# Work Card 00 — Setup Gate

## Goal

Confirm the learner has a capable coding workspace, required local tools, and publishing accounts before planning and building.

## Coding workspace checklist

Use VS Code, Antigravity, Cursor, or an equivalent workspace.

- [ ] The workspace opens this entire project folder.
- [ ] Its AI agent can read `START_HERE.md`.
- [ ] Its AI agent can create or update a markdown file in this folder.
- [ ] A terminal opens inside this project folder.
- [ ] A browser is available for localhost tests.

## Local tools checklist

- [ ] Bun installed (this project's runtime and package manager).
- [ ] Node.js installed (some tooling still expects it on `PATH`; not the primary runtime here).
- [ ] Git installed.

## Accounts checklist

- [ ] KrackedDevs account — only if you're running this inside an actual KrackedDevs session; skip for a solo build.
- [ ] GitHub signed up / logged in.
- [ ] Vercel signed up / logged in with GitHub — for the frontend.
- [ ] An account with a backend host that keeps a persistent process alive (Railway, Render, Fly.io, or one you already use) — needed later for the poll job and SQLite file; fine to set up when you reach the deploy Work Card rather than right now.
- [ ] Optional fallback AI account ready if the coding workspace becomes unavailable.

## Command checks

Run in the project terminal:

```bash
bun --version
node -v
git --version
```

Each command must print a version number. If `bun --version` is missing, install Bun before continuing — it's the runtime this project's server and package management rely on. If any command is missing, stop and fix it before building.

## Git identity check

Run:

```bash
git config --global user.name
git config --global user.email
```

If either is empty, set it with the learner's own details:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

## Windows install rescue

If Node or Git is missing on Windows, run these in PowerShell, then restart the coding workspace:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
powershell -c "irm bun.sh/install.ps1 | iex"
```

## What not to do

- Do not start app code.
- Do not scaffold a project or install packages.
- Do not initialize Git.
- Do not deploy.
- Do not skip missing file access, terminal access, Node, npm, or Git.

## Done when

- The workspace can read/write markdown files and run terminal commands in this folder.
- `bun --version` and `git --version` work.
- Git identity is present.
- GitHub and Vercel accounts are ready. Backend-host account can wait until the deploy Work Card.
- Results are recorded in `build-status.md`.

## Stop condition

If the workspace, Bun, or Git cannot be fixed in five minutes: if you're in a trainer-led session, ask for Pair Mode or Rescue Mode; running solo, search the specific error message before spending longer than that guessing.

## Status

Verified in this workspace — see `build-status.md`
