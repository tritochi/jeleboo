// Jeleboo — shared /map/bounds primitives (Card 21 + its completeness
// audit): WAQI's per-request result cap, the 30° cell grid, quadrant
// sub-division, and the depth-capped collector. Extracted from
// world-overview.ts so map-view's viewport collection uses the exact same
// rules without a circular import (world-overview already imports map-view
// for normalizeBoundsItem).

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

/**
 * Leaf-cell size for the collector. Boxes larger than this sub-divide even
 * when they return far under the cap, because /map/bounds under-returns for
 * larger boxes in a size-dependent way — measured raw against WAQI
 * 2026-09-27 (deterministic: repeat calls identical):
 *   - Delhi 7.5° box → 24 items, its four 3.75° children → 29 union;
 *   - the same 3.75° box → 20, its four 1.875° children → 21 union;
 *   - EU 30° box (cap-split path) → 1,366 vs 1,577 across 7.5° cells.
 * Splitting to CHUNK_DEGREES/8 = 3.75° keeps the measured loss ≤ ~5% while
 * bounding the leaf fan-out (4³ per 30° cell).
 */
export const TARGET_CELL_DEGREES = CHUNK_DEGREES / 8;

/**
 * Max sub-division depth from a ≤30° base cell: 30° → 15° → 7.5° → 3.75°,
 * i.e. exactly deep enough to reach TARGET_CELL_DEGREES. Doubles as a
 * recursion guard for any oversized input the planners shouldn't pass.
 */
const MAX_DEPTH = 3;

/** Split a box into its four quadrants (halves both edges, stays inside). */
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

/** True when either edge exceeds the leaf-cell target (callers pre-split
 *  antimeridian ranges, so lng2 ≥ lng1 for every real cell). */
function isOversized(box: ViewportBox): boolean {
    return (
        box.lat2 - box.lat1 > TARGET_CELL_DEGREES ||
        box.lng2 - box.lng1 > TARGET_CELL_DEGREES
    );
}

/** Injectable fetch: one bounds call for a box, normalized items out. */
export type FetchBox = (box: ViewportBox) => Promise<MapViewMarker[]>;

/**
 * Collect one chunk: fetch this box, then sub-divide when the response hits
 * WAQI's cap OR the box is larger than TARGET_CELL_DEGREES (recursive, max
 * depth 3). Ancestor items are kept alongside the descendants' — /map/bounds
 * station sets differ by box size in BOTH directions (children find stations
 * the parent omitted, the parent holds stations no child returns), so the
 * union is the only order-independent answer for "every station".
 * `fetchBox` is injectable so tests can fake the cap and the size behavior.
 *
 * Failure semantics (partial sets beat none): this node's own fetch failing
 * throws to the caller, which records the failed cell/chunk and keeps the
 * rest. A failing descendant only drops that subtree — siblings and this
 * node's own items still come back; all children failing degrades to just
 * this node's items rather than failing the whole chunk.
 */
export async function collectChunk(
    box: ViewportBox,
    depth: number,
    fetchBox: FetchBox
): Promise<MapViewMarker[]> {
    const items = await fetchBox(box);
    const shouldSplit =
        items.length >= BOUNDS_CAP || isOversized(box);
    if (!shouldSplit || depth >= MAX_DEPTH) return items;
    const settled = await Promise.allSettled(
        subdivide(box).map((c) => collectChunk(c, depth + 1, fetchBox))
    );
    const descendants = settled.flatMap((r) =>
        r.status === "fulfilled" ? r.value : []
    );
    return [...items, ...descendants];
}
