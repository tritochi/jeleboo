# Work Card 15 — DOE Guidance Line

## Card Type

Feature

## Status

Done — copy shipped on Vercel per the builder's option-1 unblock (National Haze Action Plan sourcing; agent-side PDF fetch was bot-blocked, fallback citation builder-attested — see Research log); builder device check pending (see `build-status.md`)

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
| `nrecc.gov.my/.../Pelan-tindakan-jerebu-ptjk.pdf` (builder-provided primary source, Card 15 unblock) | **Agent-side fetch bot-blocked** — as the builder predicted ("bot restriction, not a dead link"); a Wayback capture of the PDF exists but the binary doesn't text-extract |
| RTM article quoting DOE Deputy Director-General (Development) Azuri Azizah Saedon (builder-provided fallback citation) | **Builder-attested** — RTM direct quote + multiple independent outlets + a state EXCO statement all corroborate the same thresholds |

**Resolution (builder's option-1 unblock, 2026-09-15):** the copy ships citing
the **National Haze Action Plan (Pelan Tindakan Jerebu Kebangsaan)** —
coordinated across DOE/JAS, NADMA, and MOE — with the verification chain
builder-attested where the agent's fetch was bot-blocked. Shipped thresholds:
**API >100 → outdoor activities suspended; API >200 → schools close**. The
API 150 / NADMA figure is a government internal-response trigger, not a
personal action — recorded here in the sourcing note, deliberately **not** in
the UI copy. Attribution is to the **Plan**, not generically to "DOE" (DOE
sets the reading; the Plan sets the actions).

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

## What shipped (2026-09-15)

A static, muted, always-visible line under the reading card (below the
location-update hint), implemented exactly as the design.md bullet:

> Per Malaysia's National Haze Action Plan (Malaysian API scale — the reading
> above is US AQI): outdoor activities are suspended above API 100, and
> schools close above API 200.

Attribution to the Plan; both shipped thresholds (100 outdoor / 200 schools);
the API 150 / NADMA trigger stays in the sourcing note above, not the UI.
design.md bullet added before the UI. Verified: app `bun test` 10/10, both
`tsc` clean, build clean, CI green (`9211df3`), and the line + caveat +
both thresholds confirmed present in the live Vercel bundle
(`index-CWOfV1tq.js`).

## Done-when

- [x] Line live on https://jeleboo.vercel.app with Plan attribution, both
      shipped thresholds, and the mandatory scale caveat (verified in the
      deployed bundle).
- [x] design.md bullet added before the UI; 320px-safe muted styling.
- [x] `bun test` green (app 10/10), both `tsc` clean, build clean, CI green.
- [ ] Builder device check (visual: line renders under the reading card,
      caveat present) to fully close the card.

## Learner checkpoint (per prompts/06)

Preview: https://jeleboo.vercel.app — confirm the muted guidance line sits
under the reading card, names the Plan, carries the scale caveat, and reads
calmly (no alarm styling). Reply `continue` or `fix`.

## Don't

- Don't ship any threshold attributed to DOE without a verified source.
- Don't silently convert between US AQI and Malaysian API.
