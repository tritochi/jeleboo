// Jeleboo — GET /api/reading. Resolves geolocation to the nearest Malaysian
// WAQI station, parses, persists, and returns the reading. WAQI is never
// called from the frontend — keys and rate limits stay server-side.
//
// Resolution: try the coordinate endpoint first; if WAQI reports "Unknown
// station" (currently the case — the coordinate endpoint is unavailable on
// WAQI's side), fall back to the nearest known Malaysian city station by
// slug. The geolocation→station promise is preserved either way.

import { Router } from "express";
import {
    getWaqiToken,
    fetchNearestByCoordinate,
    fetchByCitySlug,
    isUnknownStation,
    parseWaqiResponse,
    type ParsedReading,
} from "../sources/waqi";
import { nearestCityStation } from "../sources/city-stations";
import { upsertReading } from "../db/queries";

const router = Router();

// Malaysia bounding box — reject anything outside it.
const MALAYSIA = { latMin: 1, latMax: 8, lngMin: 99, lngMax: 120 };

function parseCoord(v: string | null): number | null {
    if (v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n;
}

function minutesAgo(iso: string): number {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return 0;
    return Math.max(0, Math.round((Date.now() - then) / 60000));
}

/**
 * Basic per-IP rate limit for the reading endpoint so one misbehaving client
 * can't burn the day's upstream API quota for everyone.
 */
function makeRateLimiter(limit: number, windowMs: number) {
    const hits = new Map<string, number[]>();
    return function allow(ip: string): boolean {
        const now = Date.now();
        const windowStart = now - windowMs;
        const times = (hits.get(ip) ?? []).filter((t) => t > windowStart);
        times.push(now);
        hits.set(ip, times);
        return times.length <= limit;
    };
}

const readingLimiter = makeRateLimiter(30, 60_000); // 30 requests per minute per IP

async function resolveReading(lat: number, lng: number, token: string): Promise<ParsedReading> {
    // 1) Coordinate endpoint — preferred when healthy.
    try {
        const raw = await fetchNearestByCoordinate(lat, lng, token);
        if (!isUnknownStation(raw)) {
            const parsed = parseWaqiResponse(raw, "coordinate");
            if (parsed.ok) return parsed.data;
        }
    } catch {
        // Coordinate endpoint down — fall through to the city fallback.
    }

    // 2) Fallback — nearest known Malaysian city station by slug.
    const city = nearestCityStation(lat, lng);
    if (!city) {
        throw new Error("No WAQI station could be resolved for this location.");
    }
    const raw = await fetchByCitySlug(city.slug, token);
    const parsed = parseWaqiResponse(raw, "city");
    if (!parsed.ok) {
        throw new Error(parsed.error);
    }
    // WAQI's city feed omits `idx` coordinates, so `parseWaqiResponse` returns
    // 0,0. Overlay the verified station coords so the reading (and any device
    // later registered from it) carries a real Malaysian location.
    if (parsed.data.lat === 0 && parsed.data.lng === 0) {
        parsed.data.lat = city.lat;
        parsed.data.lng = city.lng;
    }
    return parsed.data;
}

router.get("/reading", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (!readingLimiter(ip)) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
    }

    const lat = parseCoord(typeof req.query.lat === "string" ? req.query.lat : null);
    const lng = parseCoord(typeof req.query.lng === "string" ? req.query.lng : null);

    if (lat === null || lng === null) {
        res.status(400).json({
            error: "Invalid parameters: lat and lng are required numeric query parameters.",
        });
        return;
    }
    if (lat < MALAYSIA.latMin || lat > MALAYSIA.latMax || lng < MALAYSIA.lngMin || lng > MALAYSIA.lngMax) {
        res.status(400).json({
            error: "Location is outside Malaysia. Jeleboo covers Malaysia only.",
        });
        return;
    }

    const token = getWaqiToken();
    try {
        const reading = await resolveReading(lat, lng, token);
        upsertReading(reading);

        res.json({
            aqi_value: reading.aqi_value,
            station_name: reading.station_name,
            source: "waqi",
            scale: reading.scale,
            recorded_at: reading.recorded_at,
            last_updated_minutes_ago: minutesAgo(reading.recorded_at),
            lat: reading.lat,
            lng: reading.lng,
            via: reading.via,
        });
    } catch (err) {
        // Never echo the token or raw upstream body.
        console.error("[reading] resolve failed:", err instanceof Error ? err.message : err);
        res.status(502).json({
            error: "Could not reach the air-quality source. Please try again shortly.",
        });
    }
});

export default router;