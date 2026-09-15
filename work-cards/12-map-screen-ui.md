# Work Card 12 — Map Screen (Station Explorer) UI

## Status

Not started (blocked by Card 11)

## Why

`design.md`'s confirmed "Map Screen (Station Explorer)" section and
`architecture.md`'s confirmed subsection define a second screen: a live map
of Malaysian station AQI pins with location search. Card 11 ships the data;
this card ships the screen. Library decision is fixed: **Leaflet +
react-leaflet, OSM tiles** — no API key, no billing account, ≈ +45 kB gz,
so the map screen is **lazy-loaded (`React.lazy`)** and the home screen's
first paint never pays for it.

## What (scope)

- **Dependencies (app/):** `leaflet`, `react-leaflet`; `@types/leaflet` as a
  dev dependency. Leaflet's CSS imported by the map screen only.
- **Entry point** — a quiet bordered **"Map"** button in the secondary
  controls below the reading card (same calm secondary style as "Set
  threshold", 44px+ target). Selecting it swaps to the map screen; the home
  screen keeps its single-reading focus — the map is never in the first
  paint.
- **Layout (single column, top to bottom):** search field ("Search a place in
  Malaysia") → map area (fills remaining height, ≥ 320px tall) → attribution
  line ("© OpenStreetMap contributors · AQI data: WAQI") in small muted text
  pinned under the map, **always visible**.
- **Search dropdown** — suggestions directly below the field, debounced
  ~300 ms from 2+ characters, hitting `GET /api/search`; each row shows the
  place name and its current AQI, is ≥ 44px tall, keyboard-reachable.
  **Selecting a result is viewing-only**: pans/zooms the map and opens the
  station's info card — it never writes the device's threshold, recorded
  location, or notification settings.
- **Pins** — circle markers from `GET /api/stations`: ~22px visual diameter
  with a ≥ 44px tap target, filled with the band's fill color and a 2px
  stroke in the band's dark text color, via the existing `severity.ts` CSS
  variables — **no new colors**. No clustering, no heat effects.
- **Station card on tap** — small card/bottom sheet in the reading card's
  fixed order: station name, severity label + monospace AQI number in the
  band's dark text color, source, "last updated". Color is always paired
  with the label.
- **States (all defined in design.md — build them, don't improvise):**
  loading (skeleton pins + "Loading stations…"), stale (cached pins +
  "Stale — stations last updated X ago" in `#BF360C`), offline/error (clean
  "Can't load the station map" card with Retry when no cached set exists),
  empty result ("No stations found here"; the map itself stays).
- **Mobile rules** — fits 320px without horizontal scroll, single column,
  thumb-reachable controls, focus order: search field → map → attribution.

## Steps

1. Add dependencies; verify the home screen bundle does not grow (map chunk
   is separate and lazy).
2. Build `MapScreen.tsx` (lazy) + the "Map" button wiring in `App.tsx`.
3. Search field + debounced dropdown against Card 11's `/api/search`.
4. Map + pins against `/api/stations`, colored strictly through
   `severity.ts`'s six-band variables.
5. Station card/popup in the fixed order.
6. All four states + attribution line.
7. Localhost pass against design.md's Map Screen bullets at 320px and 375px;
   `bun run build`, `tsc` clean, `bun test` green; commit + push (CI green),
   confirm on the live Vercel URL against the live Railway backend.

## Design check

Walk design.md's "Map Screen (Station Explorer)" section bullet-by-bullet in
the verification step — entry point, layout order, search behaviour,
viewing-only rule, pin spec, card order, every state, attribution, 320px.
Anything the section doesn't answer is a design gap: stop and update
design.md first, never style it inline during the build.

## Don't

- No clustering or heat effects — honest circles at station coordinates.
- No new colors — the six-band palette only, always paired with a label.
- The map never appears on the home screen's first paint.
- Search selection never writes threshold, location, or notification state —
  that is the Later-list saved-locations/watchlist item wearing a different
  hat and gets its own architecture pass if picked up.
- No GA/AdSense IDs; no third-party calls from the frontend (tiles are
  Leaflet/OSM's own; AQI data still flows only through the backend).

## Done-when

- [ ] Map screen live on https://jeleboo.vercel.app with real pins from the
      live backend; search suggests and pans correctly.
- [ ] Every design.md Map Screen bullet verified manually at 320px.
- [ ] Home screen first paint unchanged (map chunk lazy, not in the main
      bundle).
- [ ] `bun test` + both `tsc` + CI green; no tracking IDs; secret scan clean.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app (and localhost:5173 for the dev pass).
Test: open the map from the secondary control; drag around Peninsular
Malaysia and East Malaysia; search "kuching" and select it; tap a pin and
check the card order; toggle airplane mode and reload (offline state); tap
several pins in different bands to confirm label + color pairing. Reply
`continue` (feature complete) or `fix` + what you saw.