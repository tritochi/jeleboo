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
    it("is a quarter of the 30° base grid — the 7.5° leaf target", () => {
        expect(TARGET_CELL_DEGREES).toBe(7.5);
    });
});

describe("collectChunk", () => {
    it("fetches exactly once for a box already at the leaf target", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 7.5, lng2: 7.5 },
            0,
            fetchBox
        );
        expect(callCount).toBe(1);
        expect(out.length).toBe(1);
    });

    it("fans an oversized box to 7.5° leaves and keeps every node's items", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        expect(callCount).toBe(1 + 4 + 16);
        expect(out.length).toBe(21); // union, no dedupe inside the collector
    });

    it("rejects when the root AND every descendant fail (nowhere to fall back to)", async () => {
        const fetchBox = fakeFetch(() => true);
        await expect(
            collectChunk({ lat1: 0, lng1: 0, lat2: 30, lng2: 30 }, 0, fetchBox)
        ).rejects.toThrow("fetch down");
    });

    it("still fans out when an oversized box's root fetch fails but children succeed", async () => {
        // The incident this guards: a root 429 wiped the whole
        // Southeast-Asia chunk from the overview — the box is split-capable,
        // so the children must collect even when the root contributed nothing.
        const fetchBox = fakeFetch((box) => box.lat2 - box.lat1 === 30); // only the root
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        expect(out.length).toBe(4 * 5); // 4 quadrants × 5 nodes each
        expect(callCount).toBe(1 + 4 * 5); // 1 failed root attempt + children
    });

    it("a failed root on a box with nothing to split still rejects", async () => {
        const fetchBox = fakeFetch((box) => box.lat2 - box.lat1 <= 7.5);
        await expect(
            collectChunk({ lat1: 0, lng1: 0, lat2: 5, lng2: 5 }, 0, fetchBox)
        ).rejects.toThrow("fetch down");
    });

    it("returns this node's own items when every descendant fetch fails", async () => {
        // Only the root box is fetchable; children AND grandchildren fail,
        // so there is nothing to fall back to beyond this node's items.
        const fetchBox = fakeFetch(
            (box) => box.lat2 - box.lat1 !== 30 // everything except the root
        );
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        expect(out.length).toBe(1); // just the root's item
        expect(callCount).toBe(1 + 4 + 16); // root + failed children + failed leaves
    });

    it("drops only the failing subtree, keeping siblings and the root", async () => {
        const fetchBox = fakeFetch(
            (box) => box.lat1 === 15 && box.lng1 === 0 // one quadrant root + its NW child
        );
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 30, lng2: 30 },
            0,
            fetchBox
        );
        // The failed quadrant root falls back to ITS children: 3 of 4 survive
        // (the matching NW leaf still dies) → more data than pre-fallback.
        // root (1) + 3 healthy quadrants × 5 nodes + 3 recovered = 19
        expect(out.length).toBe(1 + 3 * 5 + 3);
        // root + healthy(3×5) + failed quadrant (root + 4 leaf attempts)
        expect(callCount).toBe(1 + 3 * 5 + 1 + 4);
    });

    it("stops at max depth for oversized input the planners shouldn't pass", async () => {
        const fetchBox = fakeFetch();
        const out = await collectChunk(
            { lat1: 0, lng1: 0, lat2: 60, lng2: 60 },
            0,
            fetchBox
        );
        // 60° needs three splits to reach 7.5°, but MAX_DEPTH = 2 from the
        // ≤30° planners — recursion halts at 15° leaves instead of looping.
        expect(callCount).toBe(1 + 4 + 16);
        expect(out.length).toBe(21);
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
