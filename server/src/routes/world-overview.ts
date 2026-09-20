// Jeleboo — GET /api/world-overview (Card 18, confirmed "World overview
// layer"). Serves the cached one-per-city global dataset (refreshed every
// WORLD_OVERVIEW_HOURS or lazily after expiry). Read-only; token stays
// server-side.

import { Router } from "express";
import { getWaqiToken } from "../sources/waqi";
import { getWorldOverview } from "../sources/world-overview";
import { makeRateLimiter } from "../lib/rate-limit";

const router = Router();

const overviewLimiter = makeRateLimiter(30, 60_000);

router.get("/world-overview", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (!overviewLimiter(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
    }

    const token = getWaqiToken();
    try {
        const result = await getWorldOverview(token);
        res.json({
            stations: result.stations,
            totalRaw: result.totalRaw,
            fetchedAt: result.fetchedAt,
            stale: result.stale,
        });
    } catch (err) {
        console.error("[world-overview] failed:", err instanceof Error ? err.message : err);
        res.status(502).json({
            error: "Could not load the world overview right now. Please try again shortly.",
        });
    }
});

export default router;
