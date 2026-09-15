// Jeleboo — WAQI station-set source for the Map & Station Explorer (Card 11).
//
// WAQI's /map/bounds endpoint is broken for Malaysia (verified live 2026-09-15:
// status=ok with zero stations, in both coordinate orders; the demo token
// errors even on a dense European box). The confirmed replacement (built on a
// live probe the same day) uses the SAME token and the /search endpoint per
// Malaysian state/territory: all 17 returned status=ok with real stations,
// each carrying uid, aqi, station.name, station.geo as [lat, lon] and
// station.country. A server-side country === "MY" guard plus keyword-driven
// queries means no Indonesian/Bruneian/Philippine stations can leak in —
// there are no bounding boxes anywhere in this design.
//
// Caching is decoupled from the 15–30 min poll on freshness-need grounds,
// not quota (WAQI's documented default quota is 1,000 req/s): the personal
// reading gates a push notification and polls tightly; the map is
// exploratory and tolerates an hour of staleness. MAP_CACHE_MINUTES sets
// the TTL (default 60). Refresh is lazy — the first request after expiry
// triggers it, and cached-last-good is served meanwhile (marked stale).

import { MALAYSIA_CITY_STATIONS, type CityStation } from "./city-stations";
import { classifyAqi, type SeverityBand } from "../theme/severity";

const WAQI_BASE = "https://api.waqi.info";

export interface StationMarker {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    aqi: number;
    band: SeverityBand;
    bandLabel: string;
    lastUpdated: string; // ISO 8601
}

export interface StationSet {
    stations: StationMarker[];
    fetchedAt: string; // ISO 8601 — when the refresh ran
    stale: boolean; // true when older than the TTL
    failedStates: string[]; // states whose /search call failed (partial set)
}

// ---- State keyword list, derived from the Card 02 table (no duplicate list) ----

// Slugs look like "malaysia/<state>/<place>" — but a handful of core stations
// are bare slugs ("kuala-lumpur", "ipoh") with no state segment. Extracting
// the distinct state segments gives exactly the 17 states/territories.
export function malaysiaStateKeywords(): string[] {
    const states = new Set<string>();
    for (const s of MALAYSIA_CITY_STATIONS) {
        const seg = s.slug.split("/")[1];
        if (seg) states.add(seg);
    }
    return [...states].map(normalizeStateKeyword).sort();
}

function normalizeStateKeyword(segment: string): string {
    let k = segment.replace(/-/g, " ");
    // "w.p. putrajaya" — searching "putrajaya" is what WAQI matches on.
    k = k.replace(/^w\.?p\.?\s+/i, "");
    // Title-case each word ("negeri sembilan" → "Negeri Sembilan").
    return k.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Raw /search response shapes (subset we rely on) ----

interface RawSearchItem {
    uid?: unknown;
    aqi?: unknown; // number or numeric string; "-" means no data
    station?: {
        name?: unknown;
        geo?: unknown;
        country?: unknown;
        url?: unknown; // e.g. "malaysia/johor/muar" — Malaysian slugs start with "malaysia/"
    };
    time?: { v?: unknown; vtime?: unknown }; // epoch seconds (WAQI uses vtime)
}

export type { RawSearchItem };

export interface RawStateResult {
    state: string;
    ok: boolean;
    items?: RawSearchItem[]; // present when ok
}

// ---- Pure normalization + merge (unit-tested in test/stations.test.ts) ----

export function normalizeSearchItem(item: RawSearchItem): StationMarker | null {
    if (!item || typeof item !== "object") return null;
    const uid = typeof item.uid === "number" ? item.uid : Number(item.uid);
    if (!Number.isFinite(uid)) return null;

    // Malaysia-only guard. Verified live (2026-09-15): WAQI /search returns
    // foreign stations freely (e.g. "kuch" matches Czech Republic and Japan),
    // and it OMITS the country field on many entries — Malaysian ones
    // included. So a bare "not MY → drop" is not enough: a result must be
    // explicitly MY *or* carry a "malaysia/..." slug; everything else goes.
    const station = item.station;
    const country = station?.country;
    const url = station?.url;
    const isMY = country === "MY"
        || (typeof url === "string" && url.startsWith("malaysia/"));
    if (!isMY) return null;

    const aqi = typeof item.aqi === "number" ? item.aqi : Number(item.aqi);
    if (!Number.isFinite(aqi) || aqi < 0) return null; // "-" or missing → no marker

    const name = typeof item.station?.name === "string" && item.station.name.length > 0
        ? item.station.name
        : null;
    if (!name) return null;

    const geo = Array.isArray(item.station?.geo) ? (item.station?.geo as unknown[]) : [];
    const lat = typeof geo[0] === "number" ? geo[0] : Number(geo[0]);
    const lng = typeof geo[1] === "number" ? geo[1] : Number(geo[1]);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    const timeV = item.time?.vtime ?? item.time?.v;
    const lastUpdated = typeof timeV === "number"
        ? new Date(timeV * 1000).toISOString()
        : new Date().toISOString();

    const severity = classifyAqi(aqi);
    return {
        uid,
        name,
        lat: hasCoords ? lat : 0,
        lng: hasCoords ? lng : 0,
        aqi,
        band: severity.band,
        bandLabel: severity.label,
        lastUpdated,
    };
}

const STATION_BY_UID: Map<number, CityStation> = new Map(
    MALAYSIA_CITY_STATIONS.map((s) => [s.uid, s])
);

/**
 * Merge one state's raw results into the set: normalize, fill missing
 * coordinates from the verified Card 02 table (matched by uid), dedupe by
 * uid, and drop anything that still has no usable coordinates.
 */
export function buildStationSet(results: readonly RawStateResult[], fetchedAt: string, stale: boolean): StationSet {
    const byUid = new Map<number, StationMarker>();
    const failedStates: string[] = [];

    for (const r of results) {
        if (!r.ok || !r.items) {
            failedStates.push(r.state);
            continue;
        }
        for (const raw of r.items) {
            const m = normalizeSearchItem(raw);
            if (!m) continue;
            // Coordinate fill-in from the Card 02 table when WAQI omits or
            // zeroes them — the same table the reading fallback uses.
            if (m.lat === 0 && m.lng === 0) {
                const known = STATION_BY_UID.get(m.uid);
                if (!known) continue; // unplaceable → no marker
                m.lat = known.lat;
                m.lng = known.lng;
            }
            const prev = byUid.get(m.uid);
            if (!prev || m.lastUpdated > prev.lastUpdated) byUid.set(m.uid, m);
        }
    }

    return {
        stations: [...byUid.values()].sort((a, b) => a.name.localeCompare(b.name)),
        fetchedAt,
        stale,
        failedStates,
    };
}

// ---- Cached fetch layer ----

function cacheTtlMs(): number {
    const n = Number(process.env.MAP_CACHE_MINUTES);
    return (Number.isFinite(n) && n > 0 ? n : 60) * 60_000;
}

let cache: StationSet | null = null;
let inflight: Promise<StationSet | null> | null = null;

function isStale(set: StationSet): boolean {
    const t = Date.parse(set.fetchedAt);
    return !Number.isFinite(t) || Date.now() - t > cacheTtlMs();
}

async function fetchState(state: string, token: string): Promise<RawStateResult> {
    const url = `${WAQI_BASE}/search/?token=${encodeURIComponent(token)}&keyword=${encodeURIComponent(state)}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[stations] /search "${state}" HTTP ${res.status}`);
            return { state, ok: false };
        }
        const json = (await res.json()) as { status?: unknown; data?: unknown };
        if (json.status !== "ok" || !Array.isArray(json.data)) {
            console.error(`[stations] /search "${state}" upstream error`);
            return { state, ok: false };
        }
        return { state, ok: true, items: json.data as RawSearchItem[] };
    } catch (err) {
        console.error(`[stations] /search "${state}" failed:`, err instanceof Error ? err.message : err);
        return { state, ok: false };
    }
}

async function refreshStationSet(token: string): Promise<StationSet> {
    const states = malaysiaStateKeywords();
    const results = await Promise.all(states.map((s) => fetchState(s, token)));
    const set = buildStationSet(results, new Date().toISOString(), false);
    if (set.stations.length === 0 && set.failedStates.length === states.length) {
        throw new Error("All state searches failed — keeping previous data if any.");
    }
    if (set.failedStates.length > 0) {
        console.warn(`[stations] partial set: ${set.failedStates.length}/${states.length} states failed`);
    }
    return set;
}

/**
 * Get the current station set. First call after TTL expiry triggers a lazy
 * refresh; when a cached-last-good exists it is served immediately (marked
 * stale) while the refresh runs in the background. Throws only when there is
 * no cached set and the refresh could not produce one.
 */
export async function getStationSet(token: string): Promise<StationSet> {
    if (cache && !isStale(cache)) return cache;

    if (cache) {
        // Serve cached-last-good immediately; refresh in the background.
        if (!inflight) {
            inflight = refreshStationSet(token)
                .then((fresh) => {
                    cache = fresh;
                    return fresh;
                })
                .catch((err) => {
                    console.error("[stations] background refresh failed:", err instanceof Error ? err.message : err);
                    return null;
                })
                .finally(() => {
                    inflight = null;
                });
        }
        return { ...cache, stale: true };
    }

    // No cache at all — first load must block on the refresh.
    const fresh = await refreshStationSet(token);
    cache = fresh;
    return fresh;
}

/** Test hook — reset the module-level cache between tests. */
export function resetStationCacheForTests(): void {
    cache = null;
    inflight = null;
}


