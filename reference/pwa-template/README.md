# Reference: PWA plumbing, adapted from augy-studios/pwa-template

Source: https://github.com/augy-studios/pwa-template — MIT License, Copyright (c) 2026 Augy Studios. Full license text in `LICENSE-NOTICE.md` in this folder; keep that notice in the repo per the MIT terms.

These are **reference files**, not wired into a build yet — Work Card 01 (project skeleton) and Work Card 06 (PWA install and offline) are what actually move the relevant pieces into `app/public/` and `app/index.html`. Do not copy these in blindly; placeholder values (name, colours, icon filenames, cache asset list) need real values once `design.md` and the actual icon set exist.

## What's kept close to the original

- `sw.js` — the cache strategy (cache-first for static/fonts, **network-first for `/api/*`**, JSON offline fallback for API calls, cached-shell fallback for navigation) is genuinely good practice for a live-data app and is reused almost exactly. Only the cache name and precached asset list changed.
- `vercel.json` — the `sin1` (Singapore) region pin is kept; it's the right region for Malaysia-facing latency.

## What's adapted

- `manifest.json` — same structure and fields, all values are Jeleboo placeholders pending `design.md`.
- `index.html` — same meta-tag conventions (OG tags, apple-touch-icon, theme-color, manifest link, inline service-worker registration), rewritten as a Vite entry HTML file rather than a static-served page.

## What's removed, not adapted

- The original's Google Analytics tag and Google AdSense script are deleted, not re-themed. They point at the template author's own accounts — shipping them as-is would send Jeleboo's traffic data and ad inventory to a third party. Add Jeleboo's own analytics later if wanted; don't add AdSense.
- `script.js` and the bare `<body>Template</body>` markup aren't reused — that's what Vite + React replaces.
- `.well-known/assetlinks.json` and `browserconfig.xml` weren't copied into this reference set — they're optional (Android TWA wrapping, legacy Windows tiles). Pull them from the original repo later only if those specific paths get used.
