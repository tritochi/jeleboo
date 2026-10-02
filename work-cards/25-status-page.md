# Work Card 25 — Public Status Page

## Card Type

Feature

## Status

Open — promoted 2026-10-02 (builder backlog pick "1–4", stream 1; build order 22 → 23 → 24 → 25 → 26, then 27)

## Why

Backlog [small] (builder QoL brainstorm + code check): a public `/status`
page — backend up, last poll X min ago, WAQI reachable. The code check
confirmed **no last-poll field exists anywhere** (`readings.recorded_at` is
the upstream measurement time, not the poll time), so this card adds a small
poll-time record plus the route.

## Spec (decided here, not while building)

- New single-row store: `meta` table (`key TEXT PRIMARY KEY, value TEXT`),
  created alongside the existing schema; the poll job writes
  `last_poll_at` (ISO) and `last_poll_ok` ("1"/"0" + optional short reason)
  after **every** run — success or failure — so the page can say the truth
  about a broken upstream, not just "server up".
- `GET /status` (server-served minimal HTML, no auth, cache-control no-store):
  - "Jeleboo — status" heading, muted calm styling, 320px-safe (no app build
    involved, styles inline in the page).
  - Server: up (implicitly, by responding) + current time.
  - Last poll: exact time + relative age, or "polling not enabled on this
    host" when the row is absent (`POLL_INTERVAL_MINUTES` unset — honest for
    local dev).
  - WAQI: "reachable at last poll" / "failed at last poll (reason)" derived
    from `last_poll_ok` — **no live probing** (the page must not add upstream
    load; one poll cadence already probes).
- A plain `GET /status.json` twin with the same fields for machines (same
  limiter bucket pattern as other routes).

## Done-when

- [ ] Poll job records both fields on success and failure runs.
- [ ] `/status` + `/status.json` live locally: poll enabled → times shown;
      poll never-run → honest "not enabled" state.
- [ ] Server tests/typecheck clean; CI green; live check on Railway.

## Don't

- Don't probe WAQI from the status route itself.
- Don't expose the token, device rows, or any reading payload on the page.
