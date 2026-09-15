# Backlog

Short entries only — a sentence or two each. See `prompts/09-iterate.md` for how items get promoted into Work Cards.

Format per item: `- [size guess] Description (how it was noticed)`

## Open

### [small] — likely one Work Card each, no architecture pass

- [small] App icon badge showing the AQI category via the Badging API (`navigator.setAppBadge(aqi)`, cleared when unreadable/offline) — frontend-only; badge platforms vary, so the card covers graceful no-op where unsupported (builder QoL brainstorm, post-ship)
- [small] DOE guidance line under the reading — public thresholds: outdoor activities discouraged above API 100, disaster-response level above 150 sustained 24h+, schools move online above 200; **card must verify current DOE wording before shipping copy — never invented phrasing** (builder QoL brainstorm, post-ship)
- [small] Web Share API "share this reading" button — frontend-only; platform-aware like `InstallPrompt`: hide where `navigator.share` is missing rather than showing a dead button (builder QoL brainstorm, post-ship)
- [small] Settings-portability URL — encode the current threshold into a shareable link (`?threshold=NN` read on load, pre-filling the setter); **threshold only** — no saved locations yet, see Blocked (builder QoL brainstorm, post-ship)
- [small] Public `/status` page — backend up, last poll X min ago, WAQI reachable. Checked: **no last-poll field exists anywhere** (`readings.recorded_at` is the upstream measurement time, not poll time), so the card adds a small poll-time field (kv/meta row or column) plus the route (builder QoL brainstorm + code check)
- [small] Good-day microcopy variation (e.g. "clear enough to open the windows today") instead of a bare green Good number — copy-only, no new logic, must keep design.md's calm tone (builder QoL brainstorm, post-ship)

### [medium] — additive to schema/logic; short spec line before the card, no architecture pass

- [medium] Dominant pollutant shown in the UI — **checked: not a pure display change.** WAQI's `dominentpol` field is neither fetched (`parseWaqiResponse` never reads it) nor stored (`readings` has no column), so the card adds parser support + a `readings.dominant_pollutant` column (migration) + route/UI passthrough (builder QoL brainstorm + code check)
- [medium] Quiet hours for notifications (per-device start/end in the `devices` schema) with the 300+ hazardous override **explicitly bypassing** quiet hours — spec the exact override copy as part of the card (builder QoL brainstorm, post-ship)
- [medium] Trend-aware early warning using existing `readings` history — the window and slope threshold that count as "climbing fast" are defined **in the card**, not while building (builder QoL brainstorm, post-ship)
- [medium] Snooze/mute notifications for a set period — needs a `muted_until`-style `devices` field; card defines the allowed durations and where the control lives (builder QoL brainstorm, post-ship)
- [medium] City-change detection — when GPS moves significantly, re-resolve the station and offer the new reading; what GPS distance counts as "significant" is defined **in the card** (builder QoL brainstorm, post-ship)

### [needs architecture.md first] — no Work Cards without builder sign-off on the architecture update

- [needs architecture] Forecast data (WAQI's existing 3–8 day forecast) — changes what gets cached: forecast has a different shape and lifecycle than a point-in-time `readings` row, so the storage model needs an architecture decision first (builder QoL brainstorm, post-ship)
- [needs architecture] Comparison mode (2–3 locations side by side) — an extension of the Map & Station Explorer architecture; note: that conversation is **no longer pending** — it was confirmed 2026-09-15 and shipped as Cards 11–12, so this is a **new addendum to the confirmed "Map & Station Explorer" section**, not to an undecided one (builder QoL brainstorm, post-ship)
- [needs architecture] Crowd-sourced "smell test" map layer — needs a new `reports` table plus real abuse/rate-limit handling before it is buildable at all; also a moderation/quality question, not just storage (builder QoL brainstorm, post-ship)

### [blocked on something else]

- [blocked] Shareable saved-location links — depends on saved locations/watchlist existing first, which is itself still just a Later-list idea in `project-brief.md` (builder QoL brainstorm, post-ship)

### Bigger, cross-cutting

- [multi-card sequence] Bilingual BM/EN toggle — **not one card**: copy lives on nearly every screen (reading card, threshold, prompts, install instructions, map screen, states). Needs its own scope pass (string-extraction approach, which strings move to a dictionary, design.md line-length implications) and a sequence of cards per screen group, so it doesn't get squeezed into one card and done badly (builder QoL brainstorm, post-ship)
- [medium, needs design.md pass first] Auto-generated shareable haze report images — canvas-generated share card; doesn't touch the data model, but the card's visual design needs a `design.md` pass (styling of the generated image) before implementation, per the design-first rule (builder QoL brainstorm, post-ship)

- [L] Post-v1: migrate the backend from Bun + Express + SQLite to Supabase (Postgres + Edge Functions + `pg_cron`) — storage, routes, the poll job, Web Push dispatch, and the server tests all need rework; revisit `architecture.md` as a structural change before any code (noticed during Card 08 host planning — builder chose Supabase but deferred it to ship v1 on the current stack first)

## Promoted

- [S] → `work-cards/10-city-fallback-station-coordinates.md` — the city-station fallback path in `GET /api/reading` returns `lat: 0, lng: 0` instead of the station's real coordinates, so a device's recorded location (via the frontend's `POST /api/devices` at Card 08) becomes `0,0 — the poll job then resolves future readings against `nearestCityStation(0,0)` rather than the user's actual Malaysian location (noticed during Card 08 live deploy verification — non-blocking for v1 proof, poll still fires, but the wrong station may be used)

- [S] → `work-cards/09-severity-scale-split.md` — split the app's severity system into the official 6-band US EPA/WAQI scale (`app/src/theme/severity.ts` and `app/src/styles.css` still merge USG/Unhealthy/Very Unhealthy into one "Unhealthy" band up to 300), giving each band a `--sev-*` pair per `design.md`; also point the AQI number at the band's dark text color instead of the bright accent (`--sev-moderate` is currently `#F9A825`, ~1.85:1 on the app background) (noticed during the `design.md` revision — see Decisions made in `build-status.md`)
