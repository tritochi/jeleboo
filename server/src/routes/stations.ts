// Jeleboo — GET /api/stations (cached Malaysian station markers) and
// GET /api/search?q=... (live WAQI /search proxy for the dropdown).
// Card 11 of the Map & Station Explorer — architecture.md confirmed 2026-09-15.
// Same never-expose-the-key pattern as /api/reading: the token stays here.

import { Router } from "express";
import { getWaqiToken } from "../sources/waqi";
import { getStationSet } from "../sources/stations";
import { makeRateLimiter } from "../lib/rate-limit";
import { normalizeSearchItem } from "../sources/stations";

const router = Router();

// Ordinary abuse protection (30/min/IP, same as the reading route) — WAQI's
// documented 1,000 req/s quota is not the constraint.
const stationsLimiter = makeRateLimiter(30, 60_000);
const searchLimiter = makeRateLimiter(30, 60_000);

router.get("/stations", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (!stationsLimiter(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
    }

    const token = getWaqiToken();
    try {
        const set = await getStationSet(token);
        res.json({
            stations: set.stations,
            fetchedAt: set.fetchedAt,
            stale: set.stale,
            failedStates: set.failedStates,
        });
    } catch (err) {
        console.error("[stations] failed to build station set:",
            err instanceof Error ? err.message : err);
        res.status(502).json({
            error: "Could not load the station map right now. Please try again shortly.",
        });
    }
});

router.get("/search", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (!searchLimiter(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
    }

    const rawQ = typeof req.query.q === "string" ? req.query.q : "";
    const q = rawQ.trim();
    if (q.length < 2) {
        res.status(400).json({
            error: "Invalid parameter: q must be at least 2 characters.",
        });
        return;
    }
    if (q.length > 80) {
        res.status(400).json({ error: "Invalid parameter: q is too long." });
        return;
    }

    const token = getWaqiToken();
    const url = `https://api.waqi.info/search/?token=${encodeURIComponent(token)}&keyword=${encodeURIComponent(q)}`;
    try {
        const res2 = await fetch(url);
        if (!res2.ok) {
            throw new Error(`WAQI HTTP ${res2.status}`);
        }
        const json = (await res2.json()) as { status?: unknown; data?: unknown };
        if (json.status !== "ok" || !Array.isArray(json.data)) {
            throw new Error("WAQI upstream error");
        }
        // Normalize + MY-only, same pipeline as the station set.
        const results = (json.data as Parameters<typeof normalizeSearchItem>[0][])
            .map(normalizeSearchItem)
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .map((m) => ({ name: m.name, aqi: m.aqi, lat: m.lat, lng: m.lng, uid: m.uid }));
        res.json({ results });
    } catch (err) {
        console.error("[search] failed:", err instanceof Error ? err.message : err);
        res.status(502).json({
            error: "Could not search places right now. Please try again shortly.",
        });
    }
});

export default router;
