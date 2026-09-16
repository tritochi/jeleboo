// Jeleboo — PUT /api/devices/:id/quiet-hours (Card 13). Validates server-side
// before any write: quiet hours are stored as minutes since midnight UTC
// (0–1439), both fields required when enabled, start must differ from end.
// The 300+ hazardous alert bypasses quiet hours in the poll job — see
// jobs/poll.ts's shouldSuppressForQuietHours.

import { Router } from "express";
import { setDeviceQuietHours, getDevice } from "../db/queries";

const router = Router();

export interface ParsedQuietHours {
    enabled: boolean;
    startUtc: number | null;
    endUtc: number | null;
}

/**
 * Validate the request body into quiet-hours values, or null when invalid.
 * Pure and unit-tested — the route must never write a malformed value.
 */
export function parseQuietHours(body: unknown): ParsedQuietHours | null {
    if (!body || typeof body !== "object") return null;
    const { enabled, startUtcMinutes, endUtcMinutes } = body as Record<string, unknown>;

    if (typeof enabled !== "boolean") return null;
    if (!enabled) {
        // Disabling needs no window — clear the stored one.
        return { enabled: false, startUtc: null, endUtc: null };
    }

    if (
        typeof startUtcMinutes !== "number" || !Number.isInteger(startUtcMinutes) ||
        typeof endUtcMinutes !== "number" || !Number.isInteger(endUtcMinutes) ||
        startUtcMinutes < 0 || startUtcMinutes > 1439 ||
        endUtcMinutes < 0 || endUtcMinutes > 1439
    ) {
        return null;
    }
    if (startUtcMinutes === endUtcMinutes) {
        // A zero-length window would mean "always quiet" — that's mute, not
        // quiet hours; snooze/mute is a separate backlog item.
        return null;
    }

    return { enabled: true, startUtc: startUtcMinutes, endUtc: endUtcMinutes };
}

router.put("/devices/:id/quiet-hours", (req, res) => {
    const device = getDevice(req.params.id);
    if (!device) {
        res.status(404).json({ error: "Device not found." });
        return;
    }

    const parsed = parseQuietHours(req.body);
    if (parsed === null) {
        res.status(400).json({
            error:
                "Invalid quiet hours: enabled must be a boolean and, when enabled, startUtcMinutes and endUtcMinutes must be different integers between 0 and 1439.",
        });
        return;
    }

    setDeviceQuietHours(req.params.id, parsed.startUtc, parsed.endUtc);
    res.json({
        id: req.params.id,
        quiet_hours_enabled: parsed.enabled,
        quiet_start_utc: parsed.startUtc,
        quiet_end_utc: parsed.endUtc,
    });
});

export default router;
