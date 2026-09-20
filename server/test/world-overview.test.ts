// Jeleboo — tests for the world overview layer (Card 18): the base grid,
// sub-division math, one-per-city dedupe, and the chunked collection flow
// (cap detection + sub-division + partial-failure tolerance) with a fake
// fetch — no network.

import { describe, it, expect } from "bun:test";
import {
    worldGrid,
    subdivide,
    cityToken,
    dedupeOnePerCity,
            collectWorldFrom,
    BOUNDS_CAP,
    type ViewportBox,
} from "../src/sources/world-overview";
import type { MapViewMarker } from "../src/sources/map-view";

function marker(name: string, uid: number, lastUpdated: string): MapViewMarker {
    return {
        uid,
        name,
        lat: 1 + (uid % 40),
        lng: 100 + (uid % 20),
        aqi: 40 + (uid % 120),
        band: "moderate",
        bandLabel: "Moderate",
        lastUpdated,
    };
}

describe("worldGrid", () => {
    it("produces 72 order-A 30°×30° cells covering the world exactly", () => {
        const grid = worldGrid();
        expect(grid.length).toBe(72);
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        for (const b of grid) {
            expect(b.lat1 < b.lat2).toBe(true);
            expect(b.lng1 < b.lng2).toBe(true);
            expect(b.lat2 - b.lat1).toBe(30);
            expect(b.lng2 - b.lng1).toBe(30);
            minLat = Math.min(minLat, b.lat1);
            maxLat = Math.max(maxLat, b.lat2);
            minLng = Math.min(minLng, b.lng1);
            maxLng = Math.max(maxLng, b.lng2);
        }
        expect(minLat).toBe(-90);
        expect(maxLat).toBe(90);
        expect(minLng).toBe(-180);
        expect(maxLng).toBe(180);
    });
});

describe("subdivide", () => {
    it("splits a box into four half-size quadrants within the parent", () => {
        const parent: ViewportBox = { lat1: 0, lng1: 100, lat2: 30, lng2: 130 };
        const kids = subdivide(parent);
        expect(kids.length).toBe(4);
        for (const k of kids) {
            expect(k.lat2 - k.lat1).toBe(15);
            expect(k.lng2 - k.lng1).toBe(15);
            expect(k.lat1 >= parent.lat1 && k.lat2 <= parent.lat2).toBe(true);
            expect(k.lng1 >= parent.lng1 && k.lng2 <= parent.lng2).toBe(true);
        }
    });
});

describe("dedupeOnePerCity", () => {
    it("keeps one entry per city token, newest wins", () => {
        const deduped = dedupeOnePerCity([
            marker("Cheras, Kuala Lumpur, Malaysia", 2626, "2026-09-17T10:00:00Z"),
            marker("Cheras, Kuala Lumpur, Malaysia", 2626, "2026-09-17T12:00:00Z"),
            marker("Kota Kinabalu, Sabah, Malaysia", 2604, "2026-09-17T11:00:00Z"),
        ]);
        expect(deduped.length).toBe(2);
        const cheras = deduped.find((m) => cityToken(m.name) === "cheras");
        expect(cheras?.lastUpdated).toBe("2026-09-17T12:00:00Z");
    });

    it("normalizes the city token (case + whitespace)", () => {
        const deduped = dedupeOnePerCity([
            marker("Kuala Lumpur", 5780, "2026-09-17T10:00:00Z"),
            marker("kuala lumpur , Selangor", 5781, "2026-09-17T09:00:00Z"),
        ]);
        expect(deduped.length).toBe(1);
        expect(deduped[0].uid).toBe(5780); // newest kept
    });
});

describe("collectWorldFrom (fake fetch — cap detection, subdivision, partial failure)", () => {
        it("sub-divides a capped cell and keeps all four quadrants' data", async () => {
        const fetched: ViewportBox[] = [];
        let callId = 0;
        // One chunk whose fetch returns the cap → subdivided into four
        // 15°-cells returning 50 each (250 raw total → deduped by unique uid).
        const result = await collectWorldFrom(
            (box) => {
                fetched.push(box);
                callId += 1;
                const base = callId * 100_000;
                const span = box.lat2 - box.lat1;
                const count = span >= 30 ? BOUNDS_CAP : span >= 15 ? 50 : 25;
                return Promise.resolve(
                    Array.from({ length: count }, (_, i) =>
                        marker(`City ${base}-${i}`, base + i, "2026-09-17T10:00:00Z")
                    )
                );
            },
            [{ lat1: 0, lng1: 100, lat2: 30, lng2: 130 }]
        );
                // depth 0: 1 call (1024 = cap) → subdivided into 4 calls at 15° (50 each).
        // The parent's 1024 (truncated) items are replaced by the sub-results.
        expect(fetched.length).toBe(5);
        expect(result.totalRaw).toBe(4 * 50);
        // Unique names/uids per call → one-per-city keeps them all.
        expect(result.stations.length).toBe(result.totalRaw);
    });

    it("tolerates failed chunks (partial sets beat none) and records them", async () => {
        const okBox: ViewportBox = { lat1: 1, lng1: 101, lat2: 2, lng2: 102 };
        const result = await collectWorldFrom(
            (box) =>
                box.lat1 === okBox.lat1
                    ? Promise.resolve([marker("Kuala Lumpur, Malaysia", 5780, "2026-09-17T10:00:00Z")])
                    : Promise.reject(new Error("chunk down")),
            [okBox, { lat1: 10, lng1: 10, lat2: 40, lng2: 40 }]
        );
        expect(result.failedChunks).toBe(1);
        expect(result.stations.length).toBe(1);
        expect(result.stations[0].name).toBe("Kuala Lumpur, Malaysia");
    });

    it("throws only when every chunk fails", async () => {
        let n = 0;
        await expect(
            collectWorldFrom(
                () => Promise.reject(new Error("down")),
                [{ lat1: 0, lng1: 0, lat2: 30, lng2: 30 }, { lat1: 0, lng1: 30, lat2: 30, lng2: 60 }]
            ).then((r) => { n = 1; return r; })
        ).rejects.toThrow("Every world chunk failed");
        expect(n).toBe(0);
    });
});
