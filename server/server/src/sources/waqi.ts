// Jeleboo — WAQI (aqicn.org) source. The token is read from the environment
// and never hardcoded; the frontend never calls this directly.

const WAQI_BASE = "https://api.waqi.info";

export type WaqiScale = "us_aqi" | "malaysia_api";

export interface ParsedReading {
    source: "waqi";
    aqi_value: number;
    station_name: string;
    scale: WaqiScale;
    recorded_at: string; // ISO 8601
    lat: number;
    lng: number;
    via: "coordinate" | "city"; // which resolution path produced it
}

export interface WaqiError {
    status: "error";
    message: string;
}

export type WaqiResponse = Record<string, unknown> | WaqiError;

export function isUnknownStation(raw: unknown): boolean {
    return !!raw && typeof raw === "object" && (raw as any).status === "error"
        && typeof (raw as any).data === "string" && (raw as any).data === "Unknown station";
}

function isWaqiError(r: any): r is WaqiError {
    return r && typeof r === "object" && r.status === "error";
}

// ---- Bounded-retry + paced JSON fetch (shared by the bounds collectors) ----

let retryDelayMs = 1000;
// Slot spacing between WAQI calls: ~20 req/s ceiling. Measured 2026-09-30:
// a 1,500-call world refresh at ~33/s with 64-way bursts drew sustained
// HTTP 429 storms (hundreds per crawl; one root 429 killed the entire
// Southeast-Asia chunk), while historical ~20/s crawls ran clean. Every
// caller shares one slot timeline, so concurrency can fan out without
// bursting past the upstream's appetite.
let paceIntervalMs = 50;
let nextSlotAt = 0;

/** Test hook — shrink the backoff so retry tests stay fast. */
export function setWaqiRetryDelayForTests(ms: number): void {
    retryDelayMs = ms;
}

/** Test hook — zero (or widen) the global request pacing in tests. */
export function setWaqiPaceIntervalForTests(ms: number): void {
    paceIntervalMs = ms;
    nextSlotAt = 0;
}

/** Reserve the next global request slot; waits if callers got ahead. */
async function pace(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, nextSlotAt);
    nextSlotAt = at + paceIntervalMs;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

/**
 * GET `url`, retrying once on transient upstream failures (network error,
 * HTTP 429/5xx, or a non-ok payload) after a short backoff. Deterministic
 * 4xx (bad token/params) fails immediately — retrying a rejected request
 * only hammers the upstream. Returns the payload's `data` field; throws the
 * last error if every attempt failed, preserving the historical error
 * strings (`WAQI HTTP <status>` / `WAQI upstream error`).
 *
 * Why: the bounds collectors fire hundreds of calls per refresh, so one
 * transient blip would otherwise become a silent hole in the station set
 * (partial sets beat none — but retries beat holes). Every attempt first
 * takes a paced slot (see above). The `label` is logged on final failure;
 * the URL is never logged because it carries the token.
 */
export async function fetchWaqiJson(url: string, label: string): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
            await new Promise((r) => setTimeout(r, retryDelayMs));
        }
        await pace();
        try {
            const res = await fetch(url);
            if (!res.ok) {
                lastError = new Error(`WAQI HTTP ${res.status}`);
                if (res.status !== 429 && res.status < 500) break; // deterministic
                continue;
            }
            const json = (await res.json()) as { status?: unknown; data?: unknown };
            if (json.status !== "ok") {
                lastError = new Error("WAQI upstream error");
                continue;
            }
            return json.data;
        } catch (err) {
            lastError = err; // network or parse failure — worth one retry
        }
    }
    console.error(
        `[waqi] ${label} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Parse a raw WAQI API response into a ParsedReading.
 * Returns an error string on failure — never throws.
 */
export function parseWaqiResponse(raw: unknown, via: "coordinate" | "city" = "coordinate"): { ok: true; data: ParsedReading } | { ok: false; error: string } {
    if (!raw || typeof raw !== "object") {
        return { ok: false, error: "WAQI returned an empty or non-object response." };
    }
    if (isWaqiError(raw)) {
        return { ok: false, error: `WAQI upstream error: ${raw.message ?? "unknown error"}` };
    }

    const r = raw as any;
    if (r.status !== "ok" || !r.data || typeof r.data !== "object") {
        return { ok: false, error: "WAQI response missing a data object." };
    }

    const data = r.data;
    const aqi = data.aqi;
    if (typeof aqi !== "number" || !Number.isFinite(aqi)) {
        return { ok: false, error: "WAQI response missing a numeric aqi value." };
    }

    const city = data.city && typeof data.city === "object" ? data.city : {};
    const stationName = typeof city.name === "string" && city.name.length > 0
        ? city.name
        : (typeof data.city_name === "string" ? data.city_name : "Unknown station");

    const time = data.time && typeof data.time === "object" ? data.time : {};
    const recordedAt = typeof time.iso === "string" ? time.iso
        : (typeof time.epoch === "number" ? new Date(time.epoch * 1000).toISOString()
        : new Date().toISOString());

    const loc = data.idx && typeof data.idx === "object" ? data.idx : {};
    const lat = typeof loc.lat === "number" ? loc.lat : 0;
    const lng = typeof loc.lng === "number" ? loc.lng : 0;

    // WAQI publishes Malaysia DOE station data converted to the US AQI scale.
    const scale: WaqiScale = "us_aqi";

    return {
        ok: true,
        data: {
            source: "waqi",
            aqi_value: aqi,
            station_name: stationName,
            scale,
            recorded_at: recordedAt,
            lat,
            lng,
            via,
        },
    };
}

/**
 * Fetch the nearest WAQI station for a lat/lng via the coordinate endpoint.
 * Throws only on a network failure or a non-OK HTTP status — callers should
 * catch and surface a clean error.
 */
export async function fetchNearestByCoordinate(lat: number, lng: number, token: string): Promise<WaqiResponse> {
    const url = `${WAQI_BASE}/feed/@${lat},${lng}/?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`WAQI HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as WaqiResponse;
}

/**
 * Fetch a WAQI station by its city slug, e.g. "kuala-lumpur" or
 * "malaysia/selangor/shah-alam". Used as the fallback when the coordinate
 * endpoint reports Unknown station (the coordinate endpoint is currently
 * unavailable on WAQI's side).
 */
export async function fetchByCitySlug(slug: string, token: string): Promise<WaqiResponse> {
    const url = `${WAQI_BASE}/feed/${encodeURIComponent(slug)}/?token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`WAQI HTTP ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as WaqiResponse;
}

/**
 * Resolve a reading for a device's last-known location, trying the coordinate
 * endpoint first and falling back to the nearest city station by slug.
 */
export async function resolveReadingForDevice(
    lat: number,
    lng: number,
    token: string
): Promise<ParsedReading> {
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
    const { nearestCityStation } = await import("./city-stations");
    const city = nearestCityStation(lat, lng);
    if (!city) {
        throw new Error("No WAQI station could be resolved for this location.");
    }
    const raw = await fetchByCitySlug(city.slug, token);
    const parsed = parseWaqiResponse(raw, "city");
    if (!parsed.ok) {
        throw new Error(parsed.error);
    }
    // Same overlay as routes/reading.ts: the city feed returns 0,0 for idx
    // coordinates; carry the verified station coords so the poll resolves
    // against a real Malaysian location.
    if (parsed.data.lat === 0 && parsed.data.lng === 0) {
        parsed.data.lat = city.lat;
        parsed.data.lng = city.lng;
    }
    return parsed.data;
}

export function getWaqiToken(): string {
    const token = process.env.WAQI_TOKEN;
    if (!token || token === "your-waqi-token-here") {
        throw new Error("WAQI_TOKEN is not set. Add it to server/.env.local.");
    }
    return token;
}