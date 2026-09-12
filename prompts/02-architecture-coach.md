# Prompt 02 — Architecture Coach

Goal: turn the confirmed brief into a practical structure and save `architecture.md`.

Read `project-brief.md` first. Use its confirmed Build Shape. If the shape is not confirmed, return to Prompt 01 before continuing.

Ask only what is needed for that shape.

## Content-led site architecture

Confirm:

- section order and factual content needed;
- one primary action;
- repeated cards or content blocks;
- navigation, links, and any non-submitting form behavior;
- responsive behavior and mobile first screen;
- whether a sample-data dashboard is clearly labelled as sample.

## Browser-local tool architecture

Confirm:

- the one data type or list;
- no more than 3–5 fields per item;
- add behavior;
- update, mark, or edit behavior;
- delete behavior;
- `localStorage` key name;
- empty state;
- refresh-persistence test.

## Live-Data App architecture

Confirm:

- the one external data source (or small proxied set of sources) and who it's called by — always the backend, never the browser directly;
- what gets cached server-side and for how long, given the source's rate limit;
- the one or two preferences stored per device (e.g. a threshold) and what identifies a device without login — typically the push subscription itself;
- what the UI shows when the live source is slow, rate-limited, or down;
- whether it ships as an installable PWA, and if so, what the manifest/service worker need to cover, including any platform-specific caveat worth stating in the UI copy itself.

## Accounts App architecture

Confirm:

- which auth approach — a hosted provider or a well-known self-hosted library — and why, never a hand-rolled password/session scheme;
- what's unlocked by logging in versus what stays public;
- the exact query-scoping rule that keeps one user from ever seeing another's data (e.g. "every table has a `user_id` column; every query filters by the session's user id");
- session/token lifetime and refresh approach;
- what account deletion actually does to the user's data, stated plainly, not left implicit.

## Commerce App architecture

Confirm:

- which payment processor, and explicit confirmation it starts in test/sandbox mode;
- what a completed order consists of — which tables, and what marks an order "paid";
- how refunds/cancellations get recorded, even if the money movement itself is still manual;
- what happens to an incomplete or abandoned payment — does it leave a dangling record, and if so, is that acceptable;
- one line noting tax/receipt requirements are jurisdiction-specific and worth a professional's review — the coach does not invent tax logic.

## Scope rescue

If the requested structure needs multiple data tables, uploads, or admin access beyond what a confirmed shape's guardrails already allow, propose a substitute without those. A database, backend, or live API alone is the Live-Data App shape working as intended. Real per-user login alone is Accounts App working as intended. A real payment alone is Commerce App working as intended. Architect the confirmed shape properly rather than shrinking it — only rescue scope that falls genuinely outside all five.

After confirmation, create `architecture.md`:

```md
# Architecture

## Build Shape

## Stack Decision

## Structure Overview

## Component Map

## Data / State Model

## Storage Logic

## User Flow

## File Expectations

## Constraints

## Technical Non-Goals

## Testing Strategy

## CI/CD

## Environments

## Monitoring & Error Tracking

## Security Notes

## Versioning & Changelog

## Verification Notes
```

Scale the six lifecycle sections (Testing Strategy through Versioning & Changelog) to the project's actual stakes — a one-evening Content-led site can say "manual localhost check only, no CI, no separate environments yet" in a single line each and that is a complete, honest answer. A project with a live backend, real users, or real payments (Live-Data App, Accounts App, Commerce App) should have a real answer in each, even if the real answer is deliberately small.

Default stack for Content-led site / Browser-local tool, unless the trainer says otherwise:

- Vite;
- React;
- plain CSS, or Tailwind only when the session is using it;
- `localStorage` only when browser-local persistence is part of the confirmed shape;
- no backend, auth, database, payment, or live API without explicit trainer approval.

Default stack for Live-Data App, unless the builder says otherwise:

- Frontend: Vite + React + TypeScript, optionally built as an installable PWA (manifest + service worker);
- Backend: a JS/TS runtime of the builder's choice (Bun and Node are both fine — Express runs on either) — the backend owns the API keys, the polling/caching logic, and any scheduled job;
- Storage: SQLite (via `bun:sqlite` on Bun, or `better-sqlite3` on Node) for the readings cache and per-device preferences;
- No user accounts, payments, or multi-user data without going beyond this shape entirely.

Default stack for Accounts App, unless the builder says otherwise:

- Everything Live-Data App uses, plus a hosted auth provider (e.g. Clerk, Auth.js/NextAuth, Supabase Auth) instead of a hand-rolled login system;
- A real relational database once there's more than one user's worth of related data (SQLite still works for a single small deployment; Postgres via a hosted provider is the upgrade once concurrent writes or multiple app instances matter).

Default stack for Commerce App, unless the builder says otherwise:

- Everything Accounts App uses, plus Stripe (or an equivalent processor) in test mode by default;
- Webhooks handled server-side only — a payment is never marked "complete" from a client-side redirect alone.

Then update `build-status.md`:

- Current phase: Design
- Completed: Architecture
- Decisions made: stack, structure, data/storage decision

Stop and ask permission before moving to Design.
