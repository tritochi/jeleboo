// Jeleboo — shared /map/bounds primitives (Card 21): WAQI's per-request
// result cap, the 30° cell grid, quadrant sub-division, and the depth-capped
// collector. Extracted from world-overview.ts so map-view's viewport
// collection uses the exact same rules without a circular import
// (world-overview already imports map-view for normalizeBoundsItem).
// Behavior unchanged from Card 18.

import type { MapViewMarker } from "./map-view";

export interface ViewportBox {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
}

/** WAQI's per-request cap on bounds results (EU 30°×30° chunk = exactly 1,024). */
export const BOUNDS_CAP = 1024;

/** Base cell size for chunked bounds fetches (world grid + viewport cells). */
export const CHUNK_DEGREES = 30;

/** Max sub-division depth when a cell returns the cap (smallest cell 7.5°×7.5°). */
const MAX_DEPTH = 2;

/** Split a box into its four quadrants (used when a chunk hits the cap). */
export function subdivide(box: ViewportBox): ViewportBox[] {
    const midLat = (box.lat1 + box.lat2) / 2;
    const midLng = (box.lng1 + box.lng2) / 2;
    return [
        { lat1: box.lat1, lng1: box.lng1, lat2: midLat, lng2: midLng },
        { lat1: box.lat1, lng1: midLng, lat2: midLat, lng2: box.lng2 },
        { lat1: midLat, lng1: box.lng1, lat2: box.lat2, lng2: midLng },
        { lat1: midLat, lng1: midLng, lat2: box.lat2, lng2: box.lng2 },
    ];
}

/** Injectable fetch: one bounds call for a box, normalized items out. */
export type FetchBox = (box: ViewportBox) => Promise<MapViewMarker[]>;

/**
 * Collect one chunk, sub-dividing when it returns the cap (recursive,
 * max depth 2 — smallest cell 7.5°×7.5°). `fetchBox` is injectable so
 * tests can fake the cap. Chunk failures throw up to the caller, which
 * records them and keeps the rest (partial sets beat none).
 */
export async function collectChunk(
    box: ViewportBox,
    depth: number,
    fetchBox: FetchBox
): Promise<MapViewMarker[]> {
    const items = await fetchBox(box);
    if (items.length < BOUNDS_CAP || depth >= MAX_DEPTH) return items;
    const collected = await Promise.all(
        subdivide(box).map((c) => collectChunk(c, depth + 1, fetchBox))
    );
    return collected.flat();
}
