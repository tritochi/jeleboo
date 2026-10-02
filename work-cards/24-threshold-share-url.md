# Work Card 24 — Threshold Share URL (Settings Portability)

## Card Type

Feature

## Status

Open — promoted 2026-10-02 (builder backlog pick "1–4", stream 1; build order 22 → 23 → 24 → 25 → 26, then 27)

## Why

Backlog [small] (builder QoL brainstorm, post-ship): make the threshold
portable between devices with a shareable link — `?threshold=NN` is read on
load and pre-fills the threshold setter. **Threshold only**; saved locations
stay blocked on the Later-list item (see backlog Blocked).

## Spec (decided here, not while building)

- On load, parse `?threshold=` once: valid = integer within the same range the
  existing setter accepts (validated against the current setter's bounds —
  implementation reads them, doesn't invent a second range). Invalid/absent →
  ignore silently, never an error UI.
- A valid value **pre-fills** the setter input (highlighted as an unsaved
  suggestion) — it is **not** saved until the user confirms with the existing
  save control. Portability must not silently overwrite a device's own
  threshold.
- After the value is consumed, strip the query param from the address bar
  (`history.replaceState`) so a refresh doesn't re-apply after the user edits.
- Frontend-only; no server change.

## Done-when

- [ ] Unit tests: valid pre-fill, out-of-range ignored, absent ignored, strip
      after consume.
- [ ] App tests/typecheck/build clean; CI green; live check:
      `jeleboo.vercel.app/?threshold=150` pre-fills, save still required.

## Don't

- Don't auto-save the incoming threshold.
- Don't extend the URL scheme to anything beyond `threshold` (locations are
  blocked work).
