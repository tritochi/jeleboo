// Jeleboo — manual push triggers for local verification. These are NOT
// scheduled jobs; they exist so a real notification can be fired on demand
// during development and testing.

import { Router } from "express";
import { getDevice } from "../db/queries";
import { sendPush, crossingPayload } from "../push/send";

const router = Router();

/**
 * POST /api/notify/test
 * Send a test push to a given device id. Body: { deviceId }
 * This is the manual trigger for local verification — it must not be a
 * real scheduled job.
 */
router.post("/notify/test", async (req, res) => {
    const deviceId = req.body?.deviceId ?? req.body?.id;
    if (!deviceId || typeof deviceId !== "string") {
        res.status(400).json({ error: "A deviceId is required." });
        return;
    }

    const device = getDevice(deviceId);
    if (!device) {
        res.status(404).json({ error: "Device not found." });
        return;
    }

    const payload: Parameters<typeof sendPush>[1] = {
        title: "Jeleboo — test notification",
        body: "Push is working. You will get a real alert when your threshold is crossed.",
        tag: "jeleboo-test",
        data: { test: true },
    };

    try {
        const result = await sendPush(device, payload);
        if (!result.ok) {
            res.status(502).json({ error: `Push failed (${result.reason}): ${result.message}` });
            return;
        }
        res.json({ ok: true, deviceId });
    } catch (err) {
        res.status(502).json({
            error: "Push dispatch threw: " + (err instanceof Error ? err.message : String(err)),
        });
    }
});

/**
 * POST /api/notify/crossing
 * Send a crossing notification to a device, simulating what the poll job
 * does. Body: { deviceId, readingValue, stationName, state }
 */
router.post("/notify/crossing", async (req, res) => {
    const { deviceId, readingValue, stationName, state } = req.body ?? {};
    if (!deviceId || typeof readingValue !== "number" || !stationName) {
        res.status(400).json({
            error: "deviceId, readingValue (number), and stationName are required.",
        });
        return;
    }

    const device = getDevice(deviceId);
    if (!device) {
        res.status(404).json({ error: "Device not found." });
        return;
    }

    const payload = crossingPayload(
        readingValue,
        stationName,
        state === "cleared" ? "cleared" : "crossed_above"
    );

    try {
        const result = await sendPush(device, payload);
        if (!result.ok) {
            res.status(502).json({ error: `Push failed (${result.reason}): ${result.message}` });
            return;
        }
        res.json({ ok: true, deviceId, payload });
    } catch (err) {
        res.status(502).json({
            error: "Push dispatch threw: " + (err instanceof Error ? err.message : String(err)),
        });
    }
});

export default router;