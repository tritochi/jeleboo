// Jeleboo — world overview layer (Card 18, confirmed addendum). A
// low-fidelity global dataset for zoomed-out map views (< zoom 4), built
// from chunked /map/bounds queries: the world as 30°×30° cells, sub-divided
// when a cell returns WAQI's per-request cap (measured: exactly 1,024
// items) OR is larger than the 7.5° leaf target (bounds.ts — /map/bounds
// deterministically under-returns for bigger boxes), then reduced to one
// marker per city. Refresh cadence: every WORLD_OVERVIEW_HOURS (default 6) —
// deliberately hours, not minutes; this is a "something is there" layer, not
// a live one. ~72 cells × (1+4+16) node fetches ≈ ~1,500 upstream calls per
// cycle (one bounded retry each — fetchWaqiJson), top-level cells batched
// WORLD_COLLECT_CONCURRENCY at a time so the crawl paces instead of bursts.
// In-memory cache, no SQLite (disposable, refetchable data).
//
// Explicitly out of scope: any change to the zoom ≥ 4 live viewport queries
// (they are the confirmed Card 16/17 behavior and are untouched here).

import { normalizeBoundsItem, type MapViewMarker } from "./map-view";
import { CHUNK_DEGREES, collectChunk, type ViewportBox } from "./bounds";
import { WORLD_COLLECT_CONCURRENCY, settleWithLimit } from "../lib/concurrency";
import { fetchWaqiJson } from "./waqi";

// The shared /map/bounds primitives (cap, grid size, sub-division, collector)
// moved to ./bounds in Card 21 so map-view can reuse them without a circular
// import; re-exported here so this module's public API is unchanged.
export { BOUNDS_CAP, subdivide } from "./bounds";
export type { ViewportBox } from "./bounds";

const WAQI_BASE = "https://api.waqi.info";

/** The 30°×30° base grid covering the whole world: 72 cells, all order-A. */
export function worldGrid(): ViewportBox[] {
    const boxes: ViewportBox[] = [];
    for (let lat = -90; lat < 90; lat += CHUNK_DEGREES) {
        for (let lng = -180; lng < 180; lng += CHUNK_DEGREES) {
            boxes.push({ lat1: lat, lng1: lng, lat2: lat + CHUNK_DEGREES, lng2: lng + CHUNK_DEGREES });
        }
    }
    return boxes;
}

// ViewportBox + subdivide are re-exported from ./bounds (top of file).

/** City token for one-per-city dedupe: the first comma-separated token of
 *  the station name, lowercased ("Cheras, Kuala Lumpur, …" → "cheras"). */
export function cityToken(name: string): string {
    return name.split(",")[0].trim().toLowerCase();
}

/**
 * One-per-city dedupe: keep the newest entry per city token. Pure and
 * unit-tested. Invalid entries (via normalizeBoundsItem's rules) are
 * dropped before this runs; this fn only picks winners.
 */
export function dedupeOnePerCity(items: MapViewMarker[]): MapViewMarker[] {
    const byCity = new Map<string, MapViewMarker>();
    for (const m of items) {
        const key = cityToken(m.name);
        const prev = byCity.get(key);
        if (!prev || m.lastUpdated > prev.lastUpdated) byCity.set(key, m);
    }
    return [...byCity.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Chunked collection (injectable fetch so the flow is unit-testable) ----

export interface WorldOverviewResult {
    stations: MapViewMarker[];
    /** uid-unique pre-city-dedupe station count — recorded per the addendum. */
    totalRaw: number;
    fetchedAt: string;
    failedChunks: number;
    /** True when served from cache (stale-last-good) during a background refresh. */
    stale: boolean;
}

async function fetchChunk(box: ViewportBox, token: string): Promise<MapViewMarker[]> {
    const url = `${WAQI_BASE}/map/bounds/?token=${encodeURIComponent(token)}&latlng=${box.lat1},${box.lng1},${box.lat2},${box.lng2}`;
    // One bounded retry inside fetchWaqiJson — without it a single blip
    // anywhere in ~1,500 calls carves a hole into the overview.
    const data = await fetchWaqiJson(url, "world-overview bounds");
    if (!Array.isArray(data)) throw new Error("WAQI upstream error");
    return (data as Parameters<typeof normalizeBoundsItem>[0][])
        .map(normalizeBoundsItem)
        .filter((m): m is MapViewMarker => m !== null);
}

// The capped-cell collector (collectChunk) moved to ./bounds in Card 21 —
// collectWorldFrom below uses the shared one.

async function collectWorld(token: string): Promise<WorldOverviewResult> {
    return collectWorldFrom((box) => fetchChunk(box, token));
}

/**
 * The chunked-collection flow with an injectable fetcher (unit tests fake
 * the cap here). Failing chunks are recorded, not fatal — partial sets beat
 * none; a fully failed world throws.
 */
export async function collectWorldFrom(
    fetchBox: (box: ViewportBox) => Promise<MapViewMarker[]>,
    chunks: ViewportBox[] = worldGrid()
): Promise<WorldOverviewResult> {
    // Batched top-level fan-out (bounded sockets), same settled shape as
    // Promise.allSettled so failure counting is unchanged. The world crawl
    // runs at the gentler WORLD batch — it's background work; pacing beats
    // bursting when the upstream is rate-sensitive.
    const results = await settleWithLimit(chunks, WORLD_COLLECT_CONCURRENCY, (c) =>
        collectChunk(c, 0, fetchBox)
    );
    const failedChunks = results.filter((r) => r.status === "rejected").length;
    if (failedChunks > 0) {
        console.warn(`[world-overview] ${failedChunks}/${chunks.length} chunks failed this refresh`);
    }
    const raw = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    // Leaf + ancestor fetches overlap by construction (union collection) —
    // count each station once before the city dedupe and for totalRaw.
    const unique = [...new Map<number, MapViewMarker>(
        raw.map((m): [number, MapViewMarker] => [m.uid, m])
    ).values()];
    if (unique.length === 0 && failedChunks === chunks.length) {
        throw new Error("Every world chunk failed — no overview data available.");
    }
        return {
        stations: dedupeOnePerCity(unique),
        totalRaw: unique.length,
        fetchedAt: new Date().toISOString(),
        failedChunks,
        stale: false,
    };
}

// ---- Cached layer + scheduler ----

function ttlMs(): number {
    const n = Number(process.env.WORLD_OVERVIEW_HOURS);
    return (Number.isFinite(n) && n > 0 ? n : 6) * 3_600_000;
}

let cache: WorldOverviewResult | null = null;
let inflight: Promise<WorldOverviewResult | null> | null = null;

function isStale(set: WorldOverviewResult): boolean {
    const t = Date.parse(set.fetchedAt);
    return !Number.isFinite(t) || Date.now() - t > ttlMs();
}

async function refresh(token: string): Promise<WorldOverviewResult> {
    const fresh = await collectWorld(token);
    console.log(`[world-overview] refresh: ${fresh.stations.length} cities (raw ${fresh.totalRaw}, failed chunks ${fresh.failedChunks})`);
    return { ...fresh, stale: false };
}

/**
 * Get the world overview. Fresh cache → serve; stale → serve stale-last-good
 * while a background refresh runs; no cache → block on the full refresh,
 * coalescing concurrent cold callers into ONE crawl (deploy-time boot
 * refresh + a client hit would otherwise run two parallel crawls — doubling
 * the upstream volume the fan-out calibration exists to control).
 * Throws only when there is no cached set and the refresh fails.
 */
export async function getWorldOverview(token: string): Promise<WorldOverviewResult> {
    if (cache && !isStale(cache)) return cache;
    if (cache) {
        if (!inflight) {
            inflight = refresh(token)
                .then((fresh) => {
                    cache = fresh;
                    return fresh;
                })
                .catch((err) => {
                    console.error("[world-overview] background refresh failed:",
                        err instanceof Error ? err.message : err);
                    return null;
                })
                .finally(() => {
                    inflight = null;
                });
        }
        return { ...cache, stale: true };
    }
    if (!inflight) {
        inflight = refresh(token)
            .then((fresh) => {
                cache = fresh;
                return fresh;
            })
            .catch((err) => {
                console.error("[world-overview] cold refresh failed:",
                    err instanceof Error ? err.message : err);
                return null;
            })
            .finally(() => {
                inflight = null;
            });
    }
    const fresh = await inflight;
    if (!fresh) throw new Error("World overview refresh failed");
    return { ...fresh, stale: false };
}

/**
 * Warm the cache on a fixed cadence. Env-gated (WORLD_OVERVIEW_HOURS, set on
 * the host like POLL_INTERVAL_MINUTES); local dev relies on the lazy
 * first-fetch instead. Returns a stop handle, mirroring the poll scheduler.
 */
export function startWorldOverviewScheduler(hours: number): { stop: () => void } {
    const token = process.env.WAQI_TOKEN ?? "";
    async function run() {
        try {
            await getWorldOverview(token);
        } catch (err) {
            console.error("[world-overview] scheduled refresh failed:",
                err instanceof Error ? err.message : err);
        }
    }
    void run();
    const timer = setInterval(run, Math.max(1, hours) * 3_600_000);
    return { stop: () => clearInterval(timer) };
}

/** Test hook — clear the module-level cache. */
export function resetWorldOverviewForTests(): void {
    cache = null;
    inflight = null;
}
