# Work Card 10 — City-Fallback Station Coordinates

## Card Type

Bugfix

## Goal

The shipped `GET /api/reading` returns `lat: 0, lng: 0` whenever WAQI's city-slug fallback path is used (WAQI omits `idx` coordinates on city-feed responses). The frontend then records `0,0` as the device's location via `POST /api/devices`, and the poll job later resolves future readings against `nearestCityStation(0,0)` — i.e. roughly the wrong station for the user. Fix the fallback to carry the **real station coordinates from `MALAYSIA_CITY_STATIONS`** (already verified real data from WAQI), so a device's recorded location and the poll's per-device resolution both use a correct Malaysian coordinate.

## Inputs

- `architecture.md` — Data / State Model, Storage Logic (nearest-station promise, poll resolution)
- `server/src/sources/city-stations.ts` — the verified `CityStation` table (real lat/lng)
- `server/src/sources/waqi.ts` — `parseWaqiResponse` (returns 0/0 on city feeds) and `resolveReadingForDevice`
- `server/src/routes/reading.ts` — `resolveReading` (user-facing fallback path)

## Files likely touched

- `server/src/routes/reading.ts` (update — overlay station coords on the city fallback)
- `server/src/sources/waqi.ts` (update — same overlay in the poll job's `resolveReadingForDevice`)
- `CHANGELOG.md` (add entry when done)
- `build-status.md` (update when done)

## Instructions for the coding agent

1. In `server/src/routes/reading.ts`, in the city fallback branch of `resolveReading`, after a successful `parseWaqiResponse(raw, "city")`: if `parsed.data.lat === 0 && parsed.data.lng === 0`, set them to the `CityStation`'s real `lat`/`lng` (the `city` from `nearestCityStation`). Keep the parsed `aqi_value`, `station_name`, `recorded_at`, `via: "city"` untouched.
2. Do the same in `server/src/sources/waqi.ts` → `resolveReadingForDevice` (the poll job's resolution path) so `readings` rows and device resolution stay consistent.
3. Keep the coordinate endpoint path unchanged — it already returns real `idx` coordinates when WAQI's coordinate endpoint is healthy (it is currently unavailable, which is why the fallback matters).
4. Do not hardcode any station — always read the coordinates from the `MALAYSIA_CITY_STATIONS` entry.
5. Run `bun test` in `server/` — regression must stay all-pass (no behavioral change to threshold/parse logic).

## What not to do

- Do not change `parseWaqiResponse`'s contract or its error handling.
- Do not touch the frontend, PWA, or the deployed env vars.
- Do not invent coordinates — only use `MALAYSIA_CITY_STATIONS`.

## Done when

- `GET /api/reading?lat=3.139&lng=101.6869` (city fallback) returns `lat` ≈ `3.139` and `lng` ≈ `101.6869` (Kuala Lumpur's station coords), not `0,0`.
- A device registered from that reading gets a real `last_lat`/`last_lng`, and the poll job resolves a reading for it (no "has no recorded location" or `0,0` resolution).
- `bun test` all-pass; server `tsc --noEmit` clean.

## Verification steps

- Live-check against the local backend after restart:
  `curl "http://localhost:3000/api/reading?lat=3.139&lng=101.6869"` → the response's `lat`/`lng` are nonzero and match the nearest city station's coordinates.
- Check the poll path: `POST /api/jobs/poll/run` → `devicesChecked` includes the device and `errors` no longer contains "no recorded location" for it.
- Run `bun test` in `server/` and `bunx tsc --noEmit -p .` in `server/`.

Design check: no UI/design change — this is backend data correctness; the reading card behavior is unchanged.

## Localhost test before continuing

After this card, the learner should test:

- [ ] `curl "http://localhost:3000/api/reading?lat=3.139&lng=101.6869"` returns nonzero `lat`/`lng` matching the nearest station (not `0,0`).
- [ ] Opening the app with geolocation denied then allowed still shows the cobalt reading card exactly as before.
- [ ] `POST /api/jobs/poll/run` runs without a "no recorded location" error for devices that have opened the app once.
- [ ] `bun test` all-pass.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If the WAQI city feed ever returns different nonzero coordinates than `MALAYSIA_CITY_STATIONS`, prefer the WAQI values when they are nonzero and only overlay on `0,0` — do not overwrite real nonzero data.

## Status

Done — verified; pending push → Railway redeploy (see `build-status.md`)