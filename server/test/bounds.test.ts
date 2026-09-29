// Jeleboo — tests for the shared bounds collector (Card 21 completeness
// audit). The collector sub-divides on WAQI's 1,024 cap AND on box size
// (3.75° leaf target), unions every node's items (upstream sets differ by
// box size in both directions), and degrades partially on child failures.
// Pure: injected fetchBox, no network.

import { describe, it, expect } from "bun:test";
import {
    collectChunk,
    subdivide,
    TARGET_CELL_DEGREES,
    type ViewportBox,
} from "../src/sources/bounds";
import type { MapViewMarker } from "../src/sources/map-view";

let callCount: number;

function marker(uid: number): MapViewMarker {
    return {
        uid,
        name: `Station ${uid}`,
        lat: 1,
        lng: 2,
        aqi: 50,
        band: "good",
        bandLabel: "Good",
        lastUpdated: "2026-09-27T00:00:00Z",
    };
}

/** One unique item per fetch (uid = call ordinal); optional failure predicate. */
function fakeFetch(fail?: (box: ViewportBox) => boolean) {
    callCount = 0;
    return async (box: ViewportBox): Promise<MapViewMarker[]> => {
        callCount += 1;
        if (fail?.(box)) throw new Error("fetch down");
        return [marker(callCount)];
    };
}

describe("TARGET_CELL_DEGREES", () => {
    it("is a quarter of the 30° grid's 7.5° cap cell — 3.75°", () => {
        expect(TARGET_CELL_DEGREES).toBe(3.75);
    });
});

describe("collectChunk", () => {
    it("fetches exactly once for a box already at the leaf target", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 3, lng2: 3 },
            0,
            fetchBox
        );
        expect(callCount).toBe(1);
        expect(out.length).toBe(1);
    });

    it("fans an oversized box to 3.75° leaves and keeps every node's items", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        expect(callCount).toBe(1 + 4 + 16 + 64);
        expect(out.length).toBe(85); // union, no dedupe inside the collector
    });

    it("propagates this node's own fetch failure to the caller", async () => {
        const fetchBox = fakeFetch(() => true);
        await expect(
            collectChunk({ lat1: 0, lng1: 0, lat2: 30, lng2: 30 }, 0, fetchBox)
        ).rejects.toThrow("fetch down");
    });

    it("returns this node's own items when every child fetch fails", async () => {
        // Children fail at their own fetch (depth ≥ 1) — the root succeeded,
        // so partial data beats none: the chunk is not lost.
        const fetchBox = fakeFetch(
            (box) => box.lat2 - box.lat1 === 15 // every depth-1 child
        );
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        expect(out.length).toBe(1); // just the root's item
        expect(callCount).toBe(1 + 4); // root + 4 failing children, no deeper
    });

    it("drops only the failing subtree, keeping siblings and the root", async () => {
        const fetchBox = fakeFetch(
            (box) => box.lat1 === 15 && box.lng1 === 0 // one depth-1 quadrant
        );
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        // root (1) + 3 healthy quadrants × 21 nodes each (15° → 7.5° → 3.75°)
        expect(out.length).toBe(1 + 3 * 21);
        expect(callCount).toBe(1 + 1 + 3 * 21); // +1: the failed fetch fired
    });

    it("stops at max depth for oversized input the planners shouldn't pass", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 60, lng2: 60 },
            0,
            fetchBox
        );
        expect(callCount).toBe(85); // 1+4+16+64, recursion bounded at depth 3
        expect(out.length).toBe(85);
    });
});

describe("subdivide", () => {
    it("halves both edges and stays inside the parent", () => {
        const kids = subdivide({ lat1: 0, lng1: 10, lat2: 30, lng2: 40 });
        expect(kids.length).toBe(4);
        for (const k of kids) {
            expect(k.lat1).toBeGreaterThanOrEqual(0);
            expect(k.lat2).toBeLessThanOrEqual(30);
            expect(k.lng1).toBeGreaterThanOrEqual(10);
            expect(k.lng2).toBeLessThanOrEqual(40);
        }
    });
});
