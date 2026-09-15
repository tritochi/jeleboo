# Design Direction

## Design Inspiration URL

https://designmd.ai/chef/verdana-health-design-system

## What We Borrow

- The semantic status color system, mapped directly to Jeleboo's severity bands rather than invented from scratch.
- Calm / whitespace ethos: generous spacing, low density, progressive disclosure.
- Monospace numerals for the AQI figure so readings align cleanly.

## What We Do Not Copy

- No clinical or telehealth tone: no appointment cards, no patient-record language.
- No harsh neons, no dense overloaded dashboards.

## Visual Mood

Calm.

## Layout Rules

- First screen is the current reading, full-width, centered. Check-and-go, not browse — the AQI number and its severity band are the hero; nothing competes with them above the fold.
- One clear primary action per screen.
- Progressive disclosure: threshold setting and notifications are secondary, revealed on demand (a "set threshold" section and a notification prompt, both collapsed by default).
- Reading card shows, in fixed order: severity label + color band, the monospace AQI number, location, source, and "last updated" — source and last-updated never appear after the number is below them.
- Spacing scale: 4px base → 8 / 12 / 16 / 24 / 32px gaps. Card padding 20–24px. Section gaps 32px. No arbitrary one-off margins.

## Color / Contrast Rules

- Severity colors are always paired with a text label — color alone never carries meaning.
- Official US EPA / WAQI severity bands (each with its fill, text, and decorative accent). Every label-on-fill pair is verified ≥ 4.5:1 — do not darken a band so its label drops below that:
  - Good (0–50) → green; fill `#E8F5E9`, text `#1B5E20`, accent `#2E7D32` (4.56:1 on fill)
  - Moderate (51–100) → yellow; fill `#FFF8E1`, text `#5D4037`, accent `#F9A825`
  - Unhealthy for Sensitive Groups (101–150) → amber; fill `#FFF3E0`, text `#BF360C`, accent `#EF6C00`
  - Unhealthy (151–200) → red; fill `#FFEBEE`, text `#B71C1C`, accent `#C62828` (4.92:1 on fill)
  - Very Unhealthy (201–299) → purple; fill `#F3E5F5`, text `#4A148C`, accent `#6A1B9A` (7.75:1 on fill)
  - Hazardous (300+) → maroon; fill `#FBEBEB`, text `#6A0000`, accent `#8E0000` (8.46:1 on fill)
- The red "300+" breakpoint maps exactly to the hardcoded hazardous flag in `project-brief.md` and the poll job's `critical_alerts_enabled` logic.
- The AQI number is always monospace, large, and in the band's text color (the dark label color listed above), never the bright accent — the yellow and amber accents do not meet 4.5:1 and must not be used for any text, including the number.
- No other colors carry meaning; the app chrome stays neutral (off-white background `#FAFAF7`, dark gray text `#1F2937`).

## Typography Feel

- Sans-serif body (system UI stack) with a calm, readable weight (400 body, 600 emphasis).
- Monospace numerals (system mono stack) for readings so the AQI aligns cleanly and reads as a figure, not prose.
- AQI number at least 56px on phone; body 16px; labels 14px.

## Component Style

- Cards: soft edges (12–16px radius), generous padding (20–24px), no harsh drop shadows — a subtle 1px border in a neutral gray instead.
- Buttons: one primary action per screen, calm weight, full-width on mobile, 44px+ touch target.
- Threshold control: a labeled input (number, 0–500) with a "Save" primary button and inline validation text; it sits below the reading card, collapsed behind a quiet "Set threshold" affordance.
- Loading / stale / offline states:
  - Loading: skeleton band + muted "Fetching latest reading…", never a blank screen.
  - Stale: the last cached reading stays visible with "Stale — last updated X ago" in dark amber `#BF360C` (≥ 4.5:1 on `#FAFAF7`).
  - Offline: clear error card "Can't reach the air-quality feed" + a Retry button; never a broken number.

## Mobile Rules

- Readable on phone width without zoom or horizontal scroll; every screen fits 320px wide.
- Single-column stack: reading card first, then threshold, then notifications — always that order.
- Primary action (e.g. "Save" threshold, "Retry") is full-width and thumb-reachable; no controls in the top 44px safe zone.
- AQI number never wraps to a second line at phone width.

## Accessibility Basics

- Color + label for every status (see Color / Contrast Rules) — never color alone.
- Every severity foreground/background pair meets ≥ 4.5:1; app chrome text ≥ 4.5:1 on the off-white background.
- Touch targets at least 44×44px.
- Focus order matches visual order (reading → threshold → notifications); visible keyboard focus on every control.
- "Last updated" is real text, not a color-only indicator.

## Add to Home Screen / Notification Prompt Style

- Android/Chrome: a slim banner below the reading card with one real button — "Add to Home Screen" — invoking the install API; explain in one line: "Get faster access + notifications." No fake buttons; if install isn't supported, hide the banner.
- iOS Safari: an instructional card (icon + text): "One-time setup: tap the Share icon → Add to Home Screen, then allow notifications." Shown only until the device is known to have notifications granted; no programmatic trigger exists on iOS.
- Notification permission prompt: plain language, shown once, after install allows it: "Jeleboo can push you a notification when your air crosses your threshold. Allow?" with Allow / Not now. Never re-ask after an explicit denial; keep an easy "notifications on/off" toggle in the threshold section.

## Map Screen (Station Explorer)

- Second screen, never the home screen: reached through a quiet secondary
  control — a bordered "Map" button in the secondary-controls stack below the
  reading card (same calm secondary style as "Set threshold"), 44px+ target.
  The home screen keeps its single-reading focus; the map is never part of
  the first paint.
- Layout (single column, top to bottom): search field ("Search a place in
  Malaysia"), the map area (fills remaining height, at least 320px tall), and
  an attribution line ("© OpenStreetMap contributors · AQI data: WAQI") in
  small muted text pinned under the map — attribution is always visible.
- Search: dropdown suggestions directly below the field, debounced ~300 ms
  from 2+ characters; each row shows the place name and its current AQI, is
  at least 44px tall, and is keyboard-reachable. Selecting a result pans and
  zooms the map to it and opens its info card. **Search is viewing-only**: it
  never changes the device's threshold, recorded location, or notification
  settings — saved locations / threshold-tied places are the Later-list
  watchlist item (`project-brief.md`) and get their own architecture pass.
- Pins: circle markers, ~22px visual diameter with a ≥44px tap target, filled
  with the severity band's fill color and a 2px stroke in the band's dark
  text color. The six-band palette from Color / Contrast Rules is reused
  as-is through the existing `classifyAqi` — no new colors. Color is always
  paired with a label: tapping a pin opens a small card/bottom sheet showing,
  in the same fixed order as the reading card, the station name, severity
  label + monospace AQI number in the band's text color, source, and "last
  updated". No clustering or heat effects — honest circles at station
  coordinates.
- States (defined now, not improvised during the build):
  - Loading: skeleton pins + muted "Loading stations…" over the map — never a
    blank canvas.
  - Stale: cached-last-good pins stay visible with "Stale — stations last
    updated X ago" in dark amber `#BF360C` (≥ 4.5:1 on `#FAFAF7`).
  - Offline/error: if no cached set exists, a clean "Can't load the station
    map" card with a Retry button — never a broken or empty-looking map.
  - Empty result: "No stations found here" message; the map itself stays.
- The map screen still obeys the mobile rules: fits 320px without horizontal
  scroll, single-column stack, thumb-reachable controls, focus order
  search field → map → attribution.

## Anti-Slop Rules

- No fake logos.
- No fake testimonials.
- No fake stats unless clearly marked sample.
- No "lorem ipsum" in final proof.
- One clear primary action.
- Readable on phone width.

## Design Verification Checklist

- [x] First screen shows current reading as the clear focus.
- [x] Severity color is paired with a label.
- [x] Source and last-updated visible next to the number.
- [x] Threshold control is clear and secondary.
- [x] Loading / stale / offline states defined.
- [x] Install prompt style defined per platform.
- [x] Notification prompt explained in plain language.
- [x] No lorem ipsum, fake testimonials, or fake stats.
- [x] Map screen defined as a second screen with its own states (see "Map
  Screen (Station Explorer)" above).