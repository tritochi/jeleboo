# Work Card 02 — Backend Data Proxy

## Card Type

Feature

## Goal

Build the backend that keeps WAQI keys and rate limits server-side: an Express route that resolves the user's geolocation to the nearest Malaysian WAQI station and returns the live reading. Also create the SQLite schema (`devices`, `readings`, `notification_log`) and a WAQI response-parsing function with a `bun test` covering it.

## Inputs

- `architecture.md` — Data / State Model, Storage Logic, Security Notes, Testing Strategy
- `build-blueprint.md` — Data / State / Storage Rules, Implementation Rules
- `project-brief.md` — Now scope

## Files likely touched

- `server/src/routes/reading.ts` (new)
- `server/src/sources/waqi.ts` (new)
- `server/src/db/schema.ts` (new)
- `server/src/db/queries.ts` (new)
- `server/src/server.ts` (update — wire the new route)
- `server/test/waqi-parse.test.ts` (new)
- `server/.env.local` (new, local only — never committed)
- `server/package.json` (update — `web-push` added in Card 05; `bun:sqlite` is built-in)

## Instructions for the coding agent

1. Create the SQLite schema in `server/src/db/schema.ts` with three tables exactly as specified in `architecture.md`'s Data / State Model:
   - `devices` (id PK, push_subscription JSON, default_threshold, critical_alerts_enabled, created_at)
   - `readings` (id PK, source, station_name, lat, lng, aqi_value, scale, recorded_at)
   - `notification_log` (id PK, device_id FK, threshold_value, reading_value, state, sent_at)
2. Open the database once via `bun:sqlite` in a shared module so all routes and the poll job share one connection.
3. Write `server/src/sources/waqi.ts` with:
   - A function that takes a WAQI API response object and parses it into `{ aqi_value, station_name, scale, recorded_at }`. Handle the case where the upstream returns an error or missing fields gracefully — return a clear error, never throw an unhandled exception.
   - The WAQI token read from `process.env.WAQI_TOKEN`, never hardcoded.
4. Create `server/src/routes/reading.ts` exposing `GET /api/reading` that:
   - Accepts `lat` and `lng` query parameters.
   - Validates them as finite numbers within Malaysia's bounding box roughly (lat 1–8, lng 99–120). Reject invalid input with a 400.
   - Calls WAQI's nearest-station endpoint using the server-side token.
   - Parses the response with the function from `waqi.ts`.
   - Upserts the reading into the `readings` table.
   - Returns `{ aqi_value, station_name, source: "waqi", scale, recorded_at, last_updated_minutes_ago }`.
   - Never returns the API key in any response body.
5. Add basic rate limiting to `/api/reading` so one misbehaving client can't burn the day's quota.
6. Wire the route into `server.ts`.
7. Write `server/test/waqi-parse.test.ts` using `bun test` covering at least: a valid WAQI response parses correctly; an error response returns a clear error; missing fields are handled. Per `architecture.md`'s Testing Strategy, this test is written now, as part of the card that introduces the behavior.
8. Create `server/.env.local` with placeholder values for `WAQI_TOKEN`, `PORT`, and `DATABASE_PATH` (or similar). It must be git-ignored.

## What not to do

- Do not ship the WAQI token in any committed file or in any frontend bundle.
- Do not call WAQI from the frontend — the frontend never calls a third-party API directly.
- Do not implement the poll job, push dispatch, or threshold evaluation yet — those are Card 04 and Card 05.
- Do not add user accounts or auth.

## Done when

- `GET /api/reading?lat=<valid>&lng=<valid>` returns a real reading object with `aqi_value`, `station_name`, `source`, `scale`, and `recorded_at`.
- `GET /api/reading` with missing or non-numeric `lat`/`lng` returns a 400.
- The reading is persisted to the `readings` table (a second call returns the cached row or a fresh upsert).
- `bun test` passes for the WAQI parse tests.
- No API key appears in any response body or in `server/src/` source files.

## Verification steps

- Start the backend and `curl "http://localhost:3000/api/reading?lat=3.139&lng=101.6869"` — must return a JSON object with a numeric `aqi_value` and a `station_name`.
- `curl "http://localhost:3000/api/reading?lat=abc&lng=def"` — must return a 400.
- Run `bun test` in `server/` — must pass.
- Grep `server/src/` for the literal token value — must find nothing hardcoded.
- Confirm `.env.local` is listed in `.gitignore`.

Design check: the returned reading object carries `source` and `recorded_at` so a number is never shown without provenance, per `design.md`.

## Localhost test before continuing

After this card, the learner should test:

- [ ] `curl` a valid lat/lng returns a real reading with `aqi_value`, `station_name`, `source`, `recorded_at`.
- [ ] `curl` with bad lat/lng returns a 400.
- [ ] `bun test` passes for the WAQI parse tests.
- [ ] No API key appears in any response or source file.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the WAQI API returns an auth error (invalid token), stop and report it — do not guess or work around the token.

## Status

Done — see `build-status.md`