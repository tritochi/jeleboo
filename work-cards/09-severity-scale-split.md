# Work Card 09 — Six-Band Severity Scale

## Card Type

Feature

## Goal

Split the app's severity system from its current four merged bands (Good / Moderate / Unhealthy up to 300 / Hazardous) into the official six-band US EPA / WAQI scale confirmed in `design.md`: Good 0–50, Moderate 51–100, Unhealthy for Sensitive Groups 101–150, Unhealthy 151–200, Very Unhealthy 201–299, Hazardous 300+. Each band gets a colour + text label pair at ≥ 4.5:1, and the AQI number renders in the band's dark text colour — never the bright accent (the current `--sev-moderate: #F9A825` is ~1.85:1 on the background, which is exactly the failure the design rule prevents).

The Hazardous breakpoint stays at 300+ on purpose: it matches the hardcoded critical flag `isHazardous` / poll `HAZARDOUS_THRESHOLD` exactly, so the displayed band always agrees with which alert fired.

## Inputs

- `design.md` — Color / Contrast Rules (the six bands, exact fill/text/accent hexes, contrast rule)
- `build-blueprint.md` — Implementation Rules (six-band rule, dark-text rule)
- `work-cards/03-live-reading-ui.md` — the completed card that introduced the four-band system (kept for history)
- `project-brief.md` — Now scope (hardcoded 300+ hazardous flag)

## Files likely touched

- `app/src/theme/severity.ts` (update — six-band `classifyAqi`, one `Severity` shape per band)
- `app/src/styles.css` (update — per-band fill/text/accent variables)
- `app/src/components/ReadingCard.tsx` (check — number colour follows band text var)
- `app/src/components/SeverityBadge.tsx` (check — badge uses fill + label text per band)
- `CHANGELOG.md` (add entry)
- `build-status.md` (update when done)

## Instructions for the coding agent

1. Replace `app/src/theme/severity.ts`'s band table with the six bands from `design.md` § Color / Contrast Rules, using the exact labels and hex pairs below (fill = the light band; text = the dark label/text colour; accent = decorative only, never for text):
   - Good (0–50) — fill `#E8F5E9`, text `#1B5E20`, accent `#2E7D32`
   - Moderate (51–100) — fill `#FFF8E1`, text `#5D4037`, accent `#F9A825`
   - Unhealthy for Sensitive Groups (101–150) — fill `#FFF3E0`, text `#BF360C`, accent `#EF6C00`
   - Unhealthy (151–200) — fill `#FFEBEE`, text `#B71C1C`, accent `#C62828`
   - Very Unhealthy (201–299) — fill `#F3E5F5`, text `#4A148C`, accent `#6A1B9A`
   - Hazardous (300+) — fill `#FBEBEB`, text `#6A0000`, accent `#8E0000`
2. Keep the existing `Severity` interface shape (band, label, cssVar) so `ReadingCard` and `SeverityBadge` keep working, but change `cssVar` to point at each band's **text** colour (with readable names such as `--sev-good-text`). The bright accents must never be used for the AQI number or any label.
3. Add matching variables to `app/src/styles.css` (e.g. `--sev-good-fill/-text/-accent`, …), keeping the existing colour names working where nothing else depends on them.
4. Keep `isHazardous(aqi)` exactly as-is (`Number.isFinite(aqi) && aqi >= 300`) — it drives the critical flag and must not change.
5. Make sure the reading number colour, the severity badge, and any "stale" styling all use the same band table — one source of truth, no hardcoded hexes in the components.
6. Do not touch backend, threshold, hysteresis, or critical-flag logic — this card is display-only.

## What not to do

- Do not change `HAZARDOUS_THRESHOLD`, `isHazardous`, or any poll/notification logic.
- Do not use a bright accent (`#F9A825`, `#EF6C00`) for any text, including the AQI number.
- Do not re-theme the app chrome (`#FAFAF7` / `#1F2937`) or the manifest.
- Do not invent new band colors beyond the six hex pairs above.

## Done when

- `classifyAqi` returns the correct band + label at every boundary: 50→Good, 51→Moderate, 100→Moderate, 101→USG, 150→USG, 151→Unhealthy, 200→Unhealthy, 201→Very Unhealthy, 299→Very Unhealthy, 300→Hazardous, 301→Hazardous.
- The AQI number and severity label render in each band's text colour (≥ 4.5:1 on the fill), never the accent.
- The frontend builds cleanly and `bun test` in `server/` still passes (backend untouched).
- `CHANGELOG.md` and `build-status.md` updated.

## Verification steps

- Classify boundaries with a one-liner (the file is pure TS — no stylesheet import), e.g.:
  `bun -e "import { classifyAqi } from './app/src/theme/severity.ts'; for (const n of [50,51,100,101,150,151,200,201,299,300,301]) console.log(n, classifyAqi(n).band, classifyAqi(n).label)"`
  Confirm the bands/labels match the table above.
- Run `bun test` in `server/` — regression must stay all-pass.
- Run the frontend build in `app/` — no errors.
- Grep `app/src/` for `#F9A825` and `#EF6C00` used as a text colour — must find none used for text (they may remain as accent variables only).

Design check: each band pairs colour with its text label using the exact six fill/text hexes from `design.md` § Color / Contrast Rules; the AQI number uses the band's dark text colour; the 300+ Hazardous band maps exactly to the critical flag.

## Localhost test before continuing

After this card, the learner should test:

- [ ] Load the app and verify the live reading shows the correct band colour + label for its value (e.g. an AQI in the 100s shows USG amber, not bright yellow).
- [ ] Boundary script above returns the six bands with the exact labels (USG 101–150, Unhealthy 151–200, Very Unhealthy 201–299, Hazardous 300+).
- [ ] Deny geolocation, seed `jeleboo:last-reading` in localStorage with a synthetic `{ "aqi_value": 210, ... }` (any suffix fields), reload — the screen shows purple "Very Unhealthy", not red "Unhealthy".
- [ ] Repeat with `aqi_value: 300` — the screen shows maroon "Hazardous", and the number is readable on its light fill.
- [ ] The app still builds and `bun test` in `server/` still passes.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If `classifyAqi` boundary tests disagree with the table above after two attempts, stop and re-read `design.md` § Color / Contrast Rules — do not invent new breakpoints.

## Status

Done — see `build-status.md`