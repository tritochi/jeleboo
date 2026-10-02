# Work Card 27 — Dominant Pollutant

## Card Type

Feature

## Status

Open — promoted 2026-10-02 (builder backlog pick "1–4", stream 2; build after the stream-1 batch (22–26))

## Spec line (required by backlog for [medium] items)

Fetch + store + display WAQI's dominant pollutant: `parseWaqiResponse` starts
reading `data.dominentpol` (WAQI's field name, verified on live feeds), a new
nullable `readings.dominant_pollutant` column stores it, `GET /api/reading`
passes it through, and the reading card shows a muted "Dominant: PM2.5" meta
line — design.md bullet added before the UI.

## Why

Backlog [medium] (builder QoL brainstorm + code check): AQI alone doesn't say
*what* is driving the number; WAQI already provides the pollutant but the
stack neither fetches nor stores it. The code check confirmed this is **not a
pure display change** (parser + migration + route + UI).

## Inputs

- `ParsedReading` gains `dominant_pollutant: string | null` (raw
  `data.dominentpol`, uppercased/trimmed; missing/`"-"` → null — never a
  placeholder string).
- Schema: `readings.dominant_pollutant TEXT` — additive migration in the same
  place the schema is created (SQLite: guarded ALTER for existing DBs, plain
  CREATE for fresh ones — follow whatever pattern the schema module already
  uses; no data backfill, historical rows stay null).
- Poll job stores it with each reading; `/api/reading` returns
  `dominant_pollutant` alongside `aqi_value` for fresh reads and the stored
  value for the cached path.
- UI: meta line on the reading card — "Dominant: {pollutant}" (e.g.
  "Dominant: PM2.5"), muted, hidden when null. design.md bullet first.

## Done-when

- [ ] Parser tests: present value normalized, missing → null, `"-"` → null.
- [ ] Migration safe on both a fresh DB and an existing pre-migration DB
      (explicit test or documented manual check).
- [ ] Route returns it; poll stores it; UI line renders and hides correctly.
- [ ] Server + app tests/typecheck/build clean; CI green; live check on
      Railway/Vercel (fresh reading shows the pollutant when WAQI sends one).

## Don't

- Don't invent a pollutant label WAQI didn't send (null → nothing shown).
- Don't change the severity/`classifyAqi` logic — pollutant is informational.
- Don't backfill history — only new readings carry the column.
