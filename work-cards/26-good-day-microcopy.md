# Work Card 26 — Good-Day Microcopy

## Card Type

Feature (copy-only)

## Status

Open — promoted 2026-10-02 (builder backlog pick "1–4", stream 1; build order 22 → 23 → 24 → 25 → 26, then 27)

## Why

Backlog [small] (builder QoL brainstorm, post-ship): a green Good number
reads bare — a calm human line adds the warmth design.md's tone allows
without inventing logic.

## Spec (decided here, not while building)

- Exact copy, shipped verbatim: **"Clear enough to open the windows today."**
- Shown under the reading card's meta lines **only when** the band is `good`
  AND the reading is fresh (not the offline/cached copy — an old Good must
  not claim today's air).
- One static string, no randomization, no new state, no other bands get
  copy (this card is Good-only by design — other bands already carry their
  labels + DOE guidance line).
- design.md gets the bullet before the UI (design-first rule).

## Done-when

- [ ] design.md bullet added first.
- [ ] Unit test: line renders for fresh Good readings, hidden for cached and
      for non-Good bands.
- [ ] App tests/typecheck/build clean; CI green; live visual check.

## Don't

- Don't randomize or A/B the copy — one line, the design tone.
- Don't show it for stale/cached readings or non-Good bands.
