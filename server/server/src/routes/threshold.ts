// Jeleboo — PUT /api/devices/:id/threshold. Validates server-side before any
// write: a malformed value must never reach the database.

import { Router } from "express";
import { setDeviceThreshold, getDevice } from "../db/queries";

const router = Router();

// AQI runs roughly 0–500; reject anything outside that band.
const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 500;

function parseThreshold(raw: unknown): number | null {
    if (typeof raw === "boolean") return null;
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed === "") return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

router.put("/devices/:id/threshold", (req, res) => {
    const device = getDevice(req.params.id);
    if (!device) {
        res.status(404).json({ error: "Device not found." });
        return;
    }

    const threshold = parseThreshold(req.body?.threshold);
    if (threshold === null) {
        res.status(400).json({
            error: "Invalid threshold: must be a number between 0 and 500.",
        });
        return;
    }
    if (threshold < MIN_THRESHOLD || threshold > MAX_THRESHOLD) {
        res.status(400).json({
            error: `Threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}.`,
        });
        return;
    }

    setDeviceThreshold(req.params.id, threshold);
    res.json({ id: req.params.id, default_threshold: threshold });
});

export default router;