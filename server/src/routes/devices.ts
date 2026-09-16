// Jeleboo — POST /api/devices. A device's push subscription IS its identity;
// there are no accounts. Card 05 wires the actual subscription.

import { Router } from "express";
import { upsertDevice, updateDeviceLocation, getDevice } from "../db/queries";

const router = Router();

router.post("/devices", (req, res) => {
    const { id, push_subscription, lat, lng } = req.body ?? {};

    if (!id || typeof id !== "string" || id.trim().length === 0) {
        res.status(400).json({ error: "A device id is required." });
        return;
    }

    if (!push_subscription || typeof push_subscription !== "object") {
        res.status(400).json({ error: "A push subscription object is required." });
        return;
    }

    upsertDevice(id.trim(), push_subscription);

    if (typeof lat === "number" && typeof lng === "number") {
        updateDeviceLocation(id.trim(), lat, lng);
    }

    res.status(201).json({ id: id.trim() });
});

router.get("/devices/:id", (req, res) => {
    const device = getDevice(req.params.id);
    if (!device) {
        res.status(404).json({ error: "Device not found." });
        return;
    }
    res.json({
        id: device.id,
        default_threshold: device.default_threshold,
        critical_alerts_enabled: Boolean(device.critical_alerts_enabled),
        quiet_start_utc: device.quiet_start_utc ?? null,
        quiet_end_utc: device.quiet_end_utc ?? null,
    });
});

export default router;