# Work Card 06 — PWA Install and Offline

## Card Type

Feature

## Goal

Make Jeleboo installable and resilient: finalize the manifest (theme/background colors from `design.md`'s severity system, real icons), wire the service worker registration, implement the platform-aware `InstallPrompt` (native on Android/Chrome, manual instructions on iOS), and confirm the offline fallback (network-first for `/api/*`, cached index.html for navigation, clean JSON error on failure) so the app shows a last-known reading rather than a broken screen.

## Inputs

- `architecture.md` — PWA plumbing basis, Component Map (InstallPrompt, NotificationPermission), Constraints
- `design.md` — Color / Contrast Rules, Layout Rules, Mobile Rules, Anti-Slop Rules
- `build-blueprint.md` — Implementation Rules
- `reference/pwa-template/` — manifest, sw.js, index.html, vercel.json
- `work-cards/03-live-reading-ui.md` — loading/stale/offline states

## Files likely touched

- `app/public/manifest.json` (update — fill theme_color/background_color, finalize icons)
- `app/public/sw.js` (update — cache name, precached asset list, offline fallback)
- `app/public/icons/` (new — 192 and 512 PNGs)
- `app/index.html` (update — finalize meta tags, register service worker)
- `app/src/components/InstallPrompt.tsx` (new)
- `app/src/App.tsx` (update — wire InstallPrompt)
- `app/vite.config.ts` (update — ensure `public/` is served as-is)

## Instructions for the coding agent

1. Finalize `app/public/manifest.json`:
   - Set `theme_color` and `background_color` to `design.md`'s neutral chrome palette: off-white background `#FAFAF7` and calm `#1F2937` accent. These are the app-chrome colours, **not** the severity band fills — severity colours are fills used only for the reading band itself. These placeholders were left from Card 01; fill them now.
   - Keep `display_override`, `categories`, `scope`, `lang`, `id` as adapted in Card 01.
   - Confirm no GA/AdSense IDs remain (verified in Card 01; re-check).
2. Provide real icons: generate or place 192x192 and 512x192 PNGs in `app/public/icons/`. They must be simple, on-brand, with no fake logos or invented imagery.
3. Finalize `app/public/sw.js`:
   - Set a Jeleboo-specific cache name.
   - Precache the app shell (index.html, manifest, icons, built JS/CSS).
   - Keep network-first for `/api/*` — a stale cached AQI number is worse than a real network error.
   - On fetch failure for `/api/*`, return a clean JSON error (`{ error: "offline" }` or similar), not a broken request.
   - For navigation requests, fall back to the cached `index.html` so the app shell loads offline.
4. Register the service worker from `app/index.html` (inline registration, per the template's pattern) and confirm it activates and controls the page.
5. Build `app/src/components/InstallPrompt.tsx` per `architecture.md`'s Component Map:
   - **Android/Chrome** — capture the browser's native `beforeinstallprompt` event, prevent its default mini-infobar, and offer an install button in Jeleboo's own UI that calls `prompt()` and handles the `userChoice` outcome.
   - **iOS Safari** — there is no programmatic trigger. Detect iOS and non-standalone mode, and show manual instructions: the Share icon → "Add to Home Screen". Explain in plain language.
   - Only one of those two branches is shown per platform — never both.
   - The prompt is a secondary, dismissible element, not a modal blocking the reading.
6. Wire `InstallPrompt` into `App.tsx`. Confirm the offline states from Card 03 still work: when the network is down, the app shows the last known reading with its age, not a blank screen.
7. Run the frontend build and confirm the `dist/`/`build/` output includes the manifest, service worker, and icons.

## What not to do

- Do not ship fake logos, invented branding, or placeholder "lorem ipsum" imagery in the icons.
- Do not show the iOS manual instructions on Android, or the native install button on iOS.
- Do not make the install prompt block the reading on first load.
- Do not cache `/api/*` responses in a way that serves a stale AQI number as current.
- Do not add AdSense or analytics IDs.

## Done when

- The manifest has finalized `theme_color`/`background_color` from `design.md`'s neutral chrome palette, real 192/512 icons, and no GA/AdSense IDs.
- The service worker is registered, activates, and controls the page.
- On Android/Chrome, the native install prompt is capturable and triggerable from Jeleboo's own button.
- On iOS, the manual Add-to-Home-Screen instructions are shown and the native button is not.
- Offline: navigating to the app shell works, and a failed `/api/*` request returns a clean JSON error while the UI shows the last-known reading with its age.
- The frontend build succeeds and includes the manifest, sw.js, and icons.

## Verification steps

- Open the app and confirm the service worker is registered and active (browser Application/Service Workers tab).
- On Android/Chrome: confirm an install button appears and can trigger the native prompt.
- On iOS Safari (or an iOS user-agent): confirm the manual Add-to-Home-Screen instructions appear and no native install button is shown.
- Disconnect the network (or throttle to offline) and reload — the app shell loads and shows the last-known reading with its age, not a blank or broken screen.
- Grep `app/public/manifest.json` and `app/index.html` for "analytics", "adsense", "UA-", "G-" — must find nothing.

Design check: the install prompt is platform-aware, secondary, and calm; icons are simple and on-brand with no fake logos; the manifest theme/background colors follow `design.md`'s neutral chrome palette; whitespace and readability are preserved at mobile width.

## Localhost test before continuing

After this card, the learner should test:

- [ ] The service worker is registered, active, and controlling the page.
- [ ] On Android/Chrome, the install button appears and triggers the native prompt.
- [ ] On iOS, the manual Add-to-Home-Screen instructions appear and no native button is shown.
- [ ] Offline, the app shell loads and shows the last-known reading with its age.
- [ ] The manifest and index.html contain no analytics/adsense IDs.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the service worker fails to activate after checking the registration twice, stop and report the exact error — do not silently swallow it.

## Status

Implemented — browser verification pending; see `build-status.md` and the Localhost test section above