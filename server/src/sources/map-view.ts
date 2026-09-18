// Jeleboo — worldwide map-view source (Card 16, confirmed "Worldwide explore
// mode" architecture). Serves viewport queries against WAQI /map/bounds with
// two verified rules baked in:
//
// 1. MY selection is a NAME-SUFFIX filter — bounds items carry no
//    `station.country` / `station.url` fields (verified live 2026-09-17), so
//    `station.name` ending with ", Malaysia" is the only reliable signal;
//    "Batam, Indonesia" and any hypothetical "…, Brunei" name fail it.
// 2. Bounds covers only 65 of the 73 Card-02 table uids, so the MY portion
//    is a UNION: bounds-MY ∪ table stations missing from bounds. The 8
//    table-only stations get live AQI via their slugs (the same
//    /feed/<slug> path the reading fallback uses — Card 10 overlay rules).
//
// Caching: one upstream call per distinct 0.5°-rounded viewport per TTL
// (MAP_VIEW_CACHE_MINUTES, default 60) — freshness-need grounds, not quota.
// Cached-last-good is served stale while a refresh runs (stations.ts
// pattern). Order A (lat1,lng1,lat2,lng2) only — order B silently returns 0.

import { MALAYSIA_CITY_STATIONS, type CityStation } from "./city-stations";
import { classifyAqi, type SeverityBand } from "../theme/severity";
import { fetchByCitySlug, parseWaqiResponse } from "./waqi";

const WAQI_BASE = "https://api.waqi.info";

export interface MapViewMarker {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    aqi: number;
    band: SeverityBand;
    bandLabel: string;
    lastUpdated: string; // ISO 8601
}

export interface MapViewResponse {
    stations: MapViewMarker[];
    fetchedAt: string;
    stale: boolean;
}

// ---- Raw /map/bounds item shape (verified live 2026-09-17) ----

export interface RawBoundsItem {
    uid?: unknown;
    aqi?: unknown; // numeric string on bounds responses
    lat?: unknown;
    lon?: unknown;
    station?: { name?: unknown; time?: unknown }; // time is an ISO string here
}

export interface Viewport {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
}

const MAX_SPAN_DEGREES = 30;

/**
 * Validate + normalize a viewport into order-A numbers, or null when
 * invalid: all four values finite, lat1 < lat2, lng1 < lng2, and the box
 * spans at most 30° per side (architecture.md guard). Pure and tested.
 */
export function normalizeViewport(raw: Partial<Record<"lat1" | "lng1" | "lat2" | "lng2", unknown>>): Viewport | null {
    const out: Record<string, number> = {};
    for (const k of ["lat1", "lng1", "lat2", "lng2"] as const) {
        const v = typeof raw[k] === "number" ? raw[k] : Number(raw[k]);
        if (!Number.isFinite(v)) return null;
        out[k] = v;
    }
    if (out.lat1 >= out.lat2 || out.lng1 >= out.lng2) return null;
    if (out.lat2 - out.lat1 > MAX_SPAN_DEGREES || out.lng2 - out.lng1 > MAX_SPAN_DEGREES) return null;
    return { lat1: out.lat1, lng1: out.lng1, lat2: out.lat2, lng2: out.lng2 };
}

/** Cache key: the viewport rounded to the 0.5° grid. Pure and tested. */
export function viewportCacheKey(v: Viewport): string {
    const r = (x: number) => Math.round(x * 2) / 2;
    return [v.lat1, v.lng1, v.lat2, v.lng2].map(r).join(",");
}

// ---- Normalization + MY selection + union (pure, unit-tested) ----

/** MY selection: name-suffix rule — bounds items have no country/url fields. */
export function isMalaysiaName(name: string): boolean {
    return name.trim().toLowerCase().endsWith(", malaysia");
}

export function normalizeBoundsItem(item: RawBoundsItem): MapViewMarker | null {
    if (!item || typeof item !== "object") return null;
    const uid = typeof item.uid === "number" ? item.uid : Number(item.uid);
    if (!Number.isFinite(uid)) return null;

    const aqi = typeof item.aqi === "number" ? item.aqi : Number(item.aqi);
    if (!Number.isFinite(aqi) || aqi < 0) return null;

    const name = typeof item.station?.name === "string" && item.station.name.length > 0
        ? item.station.name
        : null;
    if (!name) return null;

    const lat = typeof item.lat === "number" ? item.lat : Number(item.lat);
    const lng = typeof item.lon === "number" ? item.lon : Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;

    const time = item.station?.time;
    const lastUpdated = typeof time === "string" && !Number.isNaN(Date.parse(time))
        ? time
        : new Date().toISOString();

    const severity = classifyAqi(aqi);
    return {
        uid,
        name,
        lat,
        lng,
        aqi,
        band: severity.band,
        bandLabel: severity.label,
        lastUpdated,
    };
}

const STATION_BY_UID: Map<number, CityStation> = new Map(
    MALAYSIA_CITY_STATIONS.map((s) => [s.uid, s])
);

// ---- Cached fetch layer ----
// RawBoundsItem is declared with the normalizer above (exported for tests).

async function fetchBounds(v: Viewport, token: string): Promise<RawBoundsItem[]> {
    const url = `${WAQI_BASE}/map/bounds/?token=${encodeURIComponent(token)}&latlng=${v.lat1},${v.lng1},${v.lat2},${v.lng2}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`WAQI HTTP ${res.status}`);
    }
    const json = (await res.json()) as { status?: unknown; data?: unknown };
    if (json.status !== "ok" || !Array.isArray(json.data)) {
        throw new Error("WAQI upstream error");
    }
    return json.data as RawBoundsItem[];
}

/**
 * Live AQI for a table-only station (bounds missed its uid) via the same
 * /feed/<slug> path the reading fallback uses — Card 10's coordinate overlay
 * rules apply. Returns null (logged) when the slug feed fails; the station
 * retries on the next refresh rather than polluting the set.
 */
async function fetchTableOnlyStation(t: CityStation, token: string): Promise<MapViewMarker | null> {
    try {
        const raw = await fetchByCitySlug(t.slug, token);
        const parsed = parseWaqiResponse(raw, "city");
        if (!parsed.ok) throw new Error(parsed.error);
        const d = parsed.data;
        const severity = classifyAqi(d.aqi_value);
        return {
            uid: t.uid,
            name: d.station_name || t.name,
            lat: d.lat || t.lat,
            lng: d.lng || t.lng,
            aqi: d.aqi_value,
            band: severity.band,
            bandLabel: severity.label,
            lastUpdated: d.recorded_at,
        };
    } catch (err) {
        console.error(`[map-view] slug feed failed for "${t.name}" (${t.slug}):`,
            err instanceof Error ? err.message : err);
        return null;
    }
}

async function refreshMapView(v: Viewport, token: string): Promise<MapViewResponse> {
    const rawItems = await fetchBounds(v, token);
    const all = rawItems
        .map(normalizeBoundsItem)
        .filter((m): m is MapViewMarker => m !== null);

    // The MY union (and its slug fetches) applies only when the viewport
    // actually intersects Malaysia — otherwise a New York view would pull
    // all 73 Malaysian stations into itself (caught in Card 16's live check).
    const intersectsMy = viewportIntersectsMyBox(v);
    const { markers: myMarkers, tableOnly } = intersectsMy
        ? unionMy(all)
        : { markers: [] as MapViewMarker[], tableOnly: [] as CityStation[] };
    const extras = await Promise.allSettled(tableOnly.map((t) => fetchTableOnlyStation(t, token)));
    const extraMarkers = extras.flatMap((e) =>
        e.status === "fulfilled" && e.value !== null ? [e.value] : []
    );
    const failedExtras = extras.filter((e) => e.status === "rejected").length;
    if (failedExtras > 0) {
        console.warn(`[map-view] ${failedExtras} table-only slug feeds failed this refresh`);
    }

    // World portion = everything bounds returned that is not MY-selected;
    // MY portion = union markers + slug-fetched table-only extras.
    const world = all.filter((m) => !isMalaysiaName(m.name));
    const byUid = new Map<number, MapViewMarker>();
    for (const m of [...world, ...myMarkers, ...extraMarkers]) {
        byUid.set(m.uid, m); // uid dedupe across the union
    }

    return {
        stations: [...byUid.values()].sort((a, b) => a.name.localeCompare(b.name)),
        fetchedAt: new Date().toISOString(),
        stale: false,
    };
}

function ttlMs(): number {
    const n = Number(process.env.MAP_VIEW_CACHE_MINUTES);
    return (Number.isFinite(n) && n > 0 ? n : 60) * 60_000;
}

const MAX_CACHE_ENTRIES = 24; // bound memory across many distinct viewports

const cache = new Map<string, MapViewResponse>();
const inflight = new Map<string, Promise<MapViewResponse | null>>();

function isStale(set: MapViewResponse): boolean {
    const t = Date.parse(set.fetchedAt);
    return !Number.isFinite(t) || Date.now() - t > ttlMs();
}

/**
 * Get the map view for a viewport. Fresh cache → serve; stale cache → serve
 * stale-last-good while a background refresh runs; no cache → block on the
 * refresh. Throws only when there is no cached set and the fetch fails.
 */
export async function getMapView(v: Viewport, token: string): Promise<MapViewResponse> {
    const key = viewportCacheKey(v);
    const cached = cache.get(key);
    if (cached && !isStale(cached)) return cached;

    if (cached) {
        if (!inflight.has(key)) {
            inflight.set(
                key,
                refreshMapView(v, token)
                    .then((fresh) => {
                        cache.set(key, fresh);
                        return fresh;
                    })
                    .catch((err) => {
                        console.error("[map-view] background refresh failed:",
                            err instanceof Error ? err.message : err);
                        return null;
                    })
                    .finally(() => inflight.delete(key))
            );
        }
        return { ...cached, stale: true };
    }

    const fresh = await refreshMapView(v, token);
    if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, fresh);
    return fresh;
}

/** Test hook — clear the module-level cache. */
export function resetMapViewCacheForTests(): void {
    cache.clear();
    inflight.clear();
}

export interface UnionResult {
    /** bounds-MY stations with table coordinates overlaid where a uid matches. */
    markers: MapViewMarker[];
    /** Card-02 table stations absent from bounds — the caller fetches their
     *  live AQI by slug (they have no aqi in bounds results). */
    tableOnly: CityStation[];
}

/** Malaysia's bounding region — a viewport must overlap this for the MY
 *  union (and its slug fetches) to apply. Matches the boxes used to verify
 *  MY bounds coverage. Pure and unit-tested. */
const MY_BOX = { latMin: 0.8, lngMin: 99.5, latMax: 7.5, lngMax: 119.5 };

export function viewportIntersectsMyBox(v: Viewport): boolean {
    return v.lat1 <= MY_BOX.latMax && v.lat2 >= MY_BOX.latMin
        && v.lng1 <= MY_BOX.lngMax && v.lng2 >= MY_BOX.lngMin;
}

/**
 * Union the MY portion: bounds-MY items (name-suffix selected), plus every
 * Card-02 table station missing from bounds. Table coordinates overlay as
 * the stable value when a uid matches. Dedupe by uid across the union.
 * Pure and unit-tested.
 */
export function unionMy(boundsItems: MapViewMarker[]): UnionResult {
    const byUid = new Map<number, MapViewMarker>();
    const tableOnly: CityStation[] = [];

    for (const m of boundsItems) {
        if (!isMalaysiaName(m.name)) continue;
        const known = STATION_BY_UID.get(m.uid);
        byUid.set(m.uid, known ? { ...m, lat: known.lat, lng: known.lng } : m);
    }
    for (const t of MALAYSIA_CITY_STATIONS) {
        if (!byUid.has(t.uid)) tableOnly.push(t);
    }

    return {
        markers: [...byUid.values()],
        tableOnly,
    };
}

