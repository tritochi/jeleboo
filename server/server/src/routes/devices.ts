// Jeleboo — POST /api/devices. A device's push subscription IS its identity;
// there are no accounts. Card 05 wires the actual subscription.

import { Router } from "express";
import { upsertDevice, updateDeviceLocation, setDeviceStation, getDevice } from "../db/queries";

const router = Router();

router.post("/devices", (req, res) => {
    const { id, push_subscription, lat, lng, station_name } = req.body ?? {};

    if (!id || typeof id !== "string" || id.trim().length === 0) {
        res.status(400).json({ error: "A device id is required." });
        return;
    }

    if (!push_subscription || typeof push_subscription !== "object") {
        res.status(400).json({ error: "A push subscription object is required." });
        return;
    }

    // Card 14: optional per-device city record. Validated, not required —
    // older clients don't send it.
    let station: string | null = null;
    if (station_name !== undefined && station_name !== null) {
        if (typeof station_name !== "string" || station_name.trim().length === 0 || station_name.trim().length > 200) {
            res.status(400).json({ error: "station_name must be a non-empty string of at most 200 characters." });
            return;
        }
        station = station_name.trim();
    }

    upsertDevice(id.trim(), push_subscription);

    if (typeof lat === "number" && typeof lng === "number") {
        updateDeviceLocation(id.trim(), lat, lng);
    }
    if (station !== null) {
        setDeviceStation(id.trim(), station);
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
        last_station_name: device.last_station_name ?? null,
    });
});

export default router;