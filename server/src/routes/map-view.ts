// Jeleboo — GET /api/map-view (Card 16, confirmed "Worldwide explore mode").
// Proxies WAQI /map/bounds for the map's viewport with the token kept
// server-side; validates + normalizes the viewport (order A, ≤30°/side) and
// serves the MY-union'd cached set.

import { Router } from "express";
import { getWaqiToken } from "../sources/waqi";
import { getMapView, normalizeViewport } from "../sources/map-view";
import { makeRateLimiter } from "../lib/rate-limit";

const router = Router();

const mapViewLimiter = makeRateLimiter(30, 60_000);

router.get("/map-view", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (!mapViewLimiter(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
    }

    // Accept either four query params or a single comma-separated latlng.
    let raw: Record<string, unknown>;
    if (typeof req.query.latlng === "string") {
        const parts = req.query.latlng.split(",").map((s) => s.trim());
        raw = { lat1: parts[0], lng1: parts[1], lat2: parts[2], lng2: parts[3] };
    } else {
        raw = {
            lat1: req.query.lat1,
            lng1: req.query.lng1,
            lat2: req.query.lat2,
            lng2: req.query.lng2,
        };
    }

    const viewport = normalizeViewport(raw);
    if (viewport === null) {
        res.status(400).json({
            error: "Invalid viewport: lat1,lng1,lat2,lng2 must be numbers with lat1 < lat2 and lng1 < lng2, spanning at most 30 degrees per side.",
        });
        return;
    }

    const token = getWaqiToken();
    try {
        const view = await getMapView(viewport, token);
        res.json(view);
    } catch (err) {
        console.error("[map-view] failed:",
            err instanceof Error ? err.message : err);
        res.status(502).json({
            error: "Could not load stations for this map area. Please try again shortly.",
        });
    }
});

export default router;
