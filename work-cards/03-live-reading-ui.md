# Work Card 03 — Live Reading UI

## Card Type

Feature

## Goal

Build the frontend's first screen around the current reading: a check-and-go layout where the AQI number is the clear focus, paired with its severity color and a text label, plus source and last-updated time so no number appears without provenance. Wire it to the backend route from Card 02 via geolocation, and define loading, stale, and offline states per `design.md`.

## Inputs

- `architecture.md` — Component Map (Home), User Flow, Constraints
- `design.md` — Layout Rules, Color / Contrast Rules, Typography Feel, Mobile Rules, Anti-Slop Rules
- `build-blueprint.md` — Design Direction Summary, Implementation Rules
- `work-cards/02-backend-data-proxy.md` — the `/api/reading` route

## Files likely touched

- `app/src/components/ReadingCard.tsx` (new)
- `app/src/components/SeverityBadge.tsx` (new)
- `app/src/components/SourceLine.tsx` (new)
- `app/src/hooks/useReading.ts` (new)
- `app/src/App.tsx` (update — replace placeholder with the real first screen)
- `app/src/main.tsx` (update if needed)
- `app/tailwind.config.ts` (new, or equivalent styling setup)
- `app/index.html` (minor — ensure viewport meta is correct)

## Instructions for the coding agent

1. Define the severity color system in one place (e.g. `app/src/theme/severity.ts`) mapping each band to a color and a label, per `design.md`:
   - Good → green, label "Good"
   - Moderate → yellow, label "Moderate"
   - Unhealthy → red, label "Unhealthy for Sensitive Groups" (or "Unhealthy")
   - Hazardous → dark red, label "Hazardous"
   - **Every color is always paired with its text label** — color alone never carries meaning.
   > **Superseded (design.md revision, drift-fix pass):** the scale is now the official six-band US EPA/WAQI set — Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–300, Hazardous 300+ (exact fill/text hexes in `design.md` § Color / Contrast Rules). The built app merged these into four bands; the split is tracked on the backlog. Mobile floor is now 320px (this card's 360px checks were the earlier floor). This card is completed — the note keeps history honest.
2. Build `SeverityBadge.tsx` rendering both the color and the label together.
3. Build `SourceLine.tsx` showing `source` and `last_updated` (e.g. "WAQI · updated 4 min ago"). A number is never shown without this.
4. Build `ReadingCard.tsx` as the first-screen focus:
   - Large AQI number in a monospace font, per `design.md`'s Typography Feel.
   - The `SeverityBadge` beside or beneath it.
   - The `SourceLine` beneath.
   - A calm, low-density layout with generous whitespace — not a dashboard.
5. Build `useReading.ts` hook that:
   - Requests geolocation via `navigator.geolocation`.
   - Calls `GET /api/reading?lat=...&lng=...` — the frontend never calls WAQI directly.
   - Returns a `loading` state, a `data` state, and an `error` state.
   - On geolocation denial or network failure, falls back to showing the last known reading and its age, never a blank or broken screen.
6. Wire `ReadingCard` into `App.tsx` as the first screen. Include:
   - A loading skeleton or calm "getting your reading" state.
   - An error state that shows the last cached value with its age, plus a retry action.
   - An offline state detected via `navigator.onLine`.
7. Set up Tailwind (or an equivalent utility setup) with the design system's colors so the severity palette is available as named colors.
8. The layout must be mobile-first and readable on phone width without zoom — no horizontal scroll, no cut-off text or buttons.

## What not to do

- Do not call WAQI/IQAir from the frontend.
- Do not show a bare AQI number without its source and last-updated time.
- Do not use color alone to convey severity.
- Do not invent station names, readings, or locations — real data only.
- Do not implement threshold setting or notifications yet — Card 04 and Card 05.
- Do not add clinical/telehealth language (no "patient", "appointment", "diagnosis") — Jeleboo is a status reading, not a medical app.

## Done when

- Opening the app shows a real AQI reading for the user's current location, sourced from the live upstream API via the backend.
- The number is accompanied by its severity color, a text label, the source, and a last-updated time.
- On a denied geolocation or network error, the app shows a last-known reading with its age and a retry action — never a blank screen.
- The layout is readable at mobile width (360px) with no horizontal scroll.

## Verification steps

- Open the app in a browser at localhost and allow geolocation — the reading card shows a real AQI number, severity color, label, source, and last-updated time.
- Deny geolocation — the app shows a graceful fallback (last known reading or a clear message), not a broken screen.
- Resize the browser to 360px width — text, buttons, and cards are not cut off.
- Confirm the browser network tab shows no direct call to `aqicn.org` or any third-party API — only the local backend route.

Design check: the reading is the clear focus of the first screen (check-and-go, not browse); severity color is paired with a label; source and last-updated are visible next to the number; loading/stale/offline states are defined; no clinical tone; generous whitespace and monospace numbers per `design.md`.

## Localhost test before continuing

After this card, the learner should test:

- [ ] With geolocation allowed, the reading card shows a real AQI number, severity color, label, source, and last-updated time.
- [ ] With geolocation denied, the app shows a graceful fallback, not a blank screen.
- [ ] At 360px width, nothing is cut off and there is no horizontal scroll.
- [ ] The browser network tab shows no direct third-party API calls.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the backend returns no reading for the user's location twice in a row, stop and report the station name and raw response — do not invent a number to fill the card.

## Status

Done — see `build-status.md`