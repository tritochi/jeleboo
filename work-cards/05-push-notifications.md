# Work Card 05 — Push Notifications

## Card Type

Feature

## Goal

Add Web Push end to end: VAPID key generation, the frontend's permission prompt and subscription flow, the backend's push-dispatch function called from the poll job, and a manual trigger so a real notification can be fired locally before relying on the scheduled job. On iOS, disclose the Add-to-Home-Screen requirement honestly rather than hiding it.

## Inputs

- `architecture.md` — Push delivery, Component Map (NotificationPermission), Constraints, Security Notes
- `design.md` — notification permission prompt style (plain language, shown once installation allows it)
- `build-blueprint.md` — Implementation Rules
- `work-cards/04-threshold-and-storage.md` — device rows and crossing logic

## Files likely touched

- `server/src/push/vapid.ts` (new)
- `server/src/push/send.ts` (new)
- `server/src/jobs/poll.ts` (update — call the push-dispatch function on each crossing)
- `server/src/routes/notify.ts` (new — manual test trigger)
- `server/test/push-send.test.ts` (new, optional — mock `web-push`)
- `app/src/components/NotificationPrompt.tsx` (new)
- `app/src/hooks/usePushSubscription.ts` (new)
- `app/src/App.tsx` (update — wire the prompt)
- `server/.env.local` (update — add VAPID placeholders)

## Instructions for the coding agent

1. Generate VAPID keys once and store them as environment variables (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Never commit the private key. A one-time `bun` snippet or the `web-push` CLI can generate them; write the values into `.env.local` only.
2. Create `server/src/push/vapid.ts` exposing `getVapidKeys()` that reads from env and applies the `web-push` VAPID details.
3. Create `server/src/push/send.ts` exposing `sendPush(device, payload)` that:
   - Uses `web-push` with the VAPID keys.
   - Sends a notification with a plain-language title and body, e.g. "Air quality crossed your threshold" with the reading value and location.
   - Handles expiration/invalid subscription gracefully — remove or mark the device rather than crashing the poll job.
4. Update `server/src/jobs/poll.ts` so that on each crossing (from Card 04) it calls `sendPush` for the device and records the outcome in `notification_log`.
5. Create `server/src/routes/notify.ts` exposing `POST /api/notify/test` that sends a test push to a given device id. This is the manual trigger for local verification — it must not be a real scheduled job.
6. Build `app/src/hooks/usePushSubscription.ts` that:
   - Checks `Notification` support and permission state.
   - Subscribes the service worker to a push subscription via `web-push` public key.
   - POSTs the subscription to `POST /api/devices`.
7. Build `app/src/components/NotificationPrompt.tsx` per `design.md` § Add to Home Screen / Notification Prompt Style:
   - Shown once, only when installation allows it, in plain language: "Jeleboo can push you a notification when your air crosses your threshold. Allow?" with explicit **Allow** / **Not now** actions.
   - **Never re-ask after an explicit denial** — `design.md` requires it. Keep an easy "notifications on/off" toggle in the threshold section instead of the prompt.
   - On Android/Chrome this can be requested independently of installing.
   - On iOS Safari, the Push API doesn't exist until the app is running in standalone mode, so this component defers to `InstallPrompt`'s iOS instructions first and simply doesn't offer the toggle until `isStandalone` is true. Explain this in plain language, not technical jargon.
   - Never show a broken or silently-failing button on iOS.
8. Wire the prompt into `App.tsx`. It should appear after the reading is shown, secondary to the reading, once.

## What not to do

- Do not commit VAPID private key or the WAQI token.
- Do not send real push notifications to real devices during development except via the explicit test endpoint.
- Do not show the notification toggle on iOS before the app is standalone.
- Do not re-ask for notification permission after an explicit denial — `design.md` requires a never-re-ask rule and a notifications on/off toggle in the threshold section.
- Do not add user accounts — the push subscription is the device's identity.

## Done when

- VAPID keys exist as environment variables only; the private key is not in any committed file.
- The frontend requests notification permission and registers a push subscription on Android/Chrome.
- After an explicit denial, the prompt never reappears; the threshold section shows a notifications on/off toggle.
- Hitting `POST /api/notify/test` sends a real push notification to the subscribing device.
- A poll crossing dispatches a real push notification.
- On iOS, the notification toggle is not offered until the app is standalone, and the Add-to-Home-Screen requirement is disclosed in plain language.

## Verification steps

- Confirm `VAPID_PRIVATE_KEY` does not appear anywhere in the repo (grep the whole tree).
- On Android/Chrome: allow notifications, confirm a subscription is registered and a test push arrives.
- Trigger `POST /api/notify/test` against the subscribing device — a real notification fires.
- On iOS Safari (or an iOS user-agent in a desktop Safari): confirm the notification toggle is not shown until standalone, and the InstallPrompt iOS instructions are visible.
- Deny the permission prompt once and confirm it never reappears; confirm the threshold section has a notifications on/off toggle.

Design check: the notification prompt is explained in plain language, shown once installation allows it, never re-asks after an explicit denial, has a notifications on/off toggle in the threshold section, and is secondary to the reading — per `design.md`.

## Localhost test before continuing

After this card, the learner should test:

- [ ] `VAPID_PRIVATE_KEY` is not present anywhere in the repo.
- [ ] On Android/Chrome, allowing notifications registers a subscription and a test push arrives.
- [ ] `POST /api/notify/test` fires a real notification to the subscribing device.
- [ ] On iOS, the toggle is hidden until standalone and the Add-to-Home-Screen instructions are shown.
- [ ] Denying the prompt once means it never reappears; the threshold section has a notifications on/off toggle.

If all tests pass, reply `continue`.
If anything fails, reply `fix` and paste the error or describe what you see.

## Stop condition

If `web-push` fails to send with a VAPID error after regenerating keys twice, stop and report the error — do not keep retrying with the same keys.

## Status

In progress — see `build-status.md`