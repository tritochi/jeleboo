# Work Card 15 — DOE Guidance Line

## Card Type

Feature

## Status

**Blocked on copy verification** — the three brainstormed thresholds could not be verified against any reachable official DOE source; no copy shipped, no code written. Awaiting the builder's official source or a decision on the verified fallback (see Research Log below).

## Why

Backlog [small] (builder QoL brainstorm, promoted 2026-09-15 as priority 3 of
3): a DOE guidance line under the reading. The brainstorm named three
thresholds — outdoor activities discouraged above API 100, disaster-response
level above 150 sustained 24h+, schools move online above 200 — with a hard
rule: **verify current DOE wording before shipping copy, never invent
phrasing.** The verification pass failed to confirm them; this card records
that honestly instead of shipping unverified copy.

## Research log (2026-09-15, verbatim-capable sources only)

| Source | Result |
|---|---|
| `apims.doe.gov.my` | Now a JS app shell ("MyEQMS") — **no verbatim guidance text extractable** |
| `doe.gov.my/en/` (official portal) | Loaded; navigation only — **no per-threshold advisory wording found**; older `portalv1` API-info URL 404s |
| Wikipedia "Air Pollution Index" + "Air pollution in Malaysia" (both citing DOE's *"General Information of Air Pollutant Index"*) | **Verified:** Malaysia's official API categories — 0–50 Good, 51–100 Moderate, 101–200 Unhealthy, 201–300 Very Unhealthy, 301–500 Hazardous, >500 state of emergency |
| Web Archive attempts (DOE API-info page, APIMS api-info) | 404 — no archived copy reachable |

**Not verified anywhere reachable:** the three brainstormed thresholds
(100 outdoor / 150 sustained-24h disaster / 200 schools). They may exist in
the National Haze Action Plan or MOE circulars, but no official wording was
reachable, so they cannot ship as DOE guidance.

## Additional blocker found during research: the scales don't match

Jeleboo displays **US AQI** (WAQI converts Malaysia's DOE measurements to the
US scale — `scale: "us_aqi"` everywhere in the stack). DOE guidance
thresholds are on the **Malaysian API scale**, which is a different curve.
Even with verified wording, "limit outdoor activity above API 100" placed
under a US AQI number would invite misreading. Any shipped line must state
the scale explicitly (e.g. "DOE's Malaysian API scale — the reading above is
US AQI") or the feature needs a scale decision first.

## Options for the builder (pick one to unblock)

1. **Provide the official source** — a DOE/MOE/NRECC link or document naming
   the three thresholds (e.g. the National Haze Action Plan). I verify it,
   then ship the line quoting it exactly, labeled with the scale caveat.
2. **Ship the verified fallback** — a reference line using only the verified
   DOE API categories + pointer to `apims.doe.gov.my`, clearly labeled
   "Malaysian API scale (the reading above is US AQI)". No per-threshold
   advice claims.
3. **Drop the item** — close the card as won't-do for now; the line returns
   if an official source surfaces later.

## What would have been built (on hold pending the decision)

A static, muted, always-visible line under the reading card (design.md bullet
first), copy quoted from the chosen source with attribution, 320px-safe, no
per-band dynamic logic (dynamic mapping US-AQI→API guidance is deliberately
out of scope without a scale decision).

## Don't

- Don't ship any threshold attributed to DOE without a verified source.
- Don't silently convert between US AQI and Malaysian API.
