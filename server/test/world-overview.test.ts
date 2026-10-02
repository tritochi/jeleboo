// Jeleboo — tests for the world overview layer (Card 18): the base grid,
// sub-division math, one-per-city dedupe, and the chunked collection flow
// (cap detection + sub-division + partial-failure tolerance) with a fake
// fetch — no network.

import { describe, it, expect, afterEach, beforeAll } from "bun:test";
import {
    worldGrid,
    subdivide,
    cityToken,
    dedupeOnePerCity,
            collectWorldFrom,
    getWorldOverview,
    mergeStaleIntoOverview,
    resetWorldOverviewForTests,
    BOUNDS_CAP,
    type ViewportBox,
} from "../src/sources/world-overview";
import { setWaqiRetryDelayForTests, setWaqiPaceIntervalForTests } from "../src/sources/waqi";
import {
    resetStaleStationsForTests,
    COUNTRY_KEYWORDS,
} from "../src/sources/stale-stations";
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
        // One chunk whose fetch returns the cap → sub-divided to 7.5° leaves
        // (sizes: 30° → cap, 15° → 50, 7.5° → 25).
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
        // depth 0: 1 call (1024 = cap) → sub-divides 30° → 15° → 7.5°:
        // 1 + 4 + 16 = 21 calls. Every node's items stay in the union
        // (1024 + 4×50 + 16×25 = 1,624 uid-unique here), so neither the
        // truncated root nor any station a child found last is lost.
        expect(fetched.length).toBe(21);
        expect(result.totalRaw).toBe(1024 + 4 * 50 + 16 * 25);
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

describe("mergeStaleIntoOverview (uid-first before city dedupe)", () => {
    it("keeps ONE entry per uid, preferring the bounds name over search's keyword prefix", () => {
        const bounds = [marker("Albany County HD, New York, USA", 5100, "2026-10-02T00:00:00Z")];
        const stale = [marker("albania; Albany County HD, New York, USA", 5100, "2026-06-01T00:00:00Z")];
        const out = mergeStaleIntoOverview(bounds, stale);
        expect(out.length).toBe(1);
        expect(out[0].name).toBe("Albany County HD, New York, USA"); // bounds wins
        expect(out[0].lastUpdated).toBe("2026-10-02T00:00:00Z"); // live wins
    });

    it("adds stale-only stations and passes bounds through untouched when no stale set", () => {
        const bounds = [marker("Kuala Lumpur, Malaysia", 1, "2026-10-02T00:00:00Z")];
        const stale = [marker("Manila US Embassy, Philippines", 14893, "2026-02-06T00:00:00Z")];
        const out = mergeStaleIntoOverview(bounds, stale);
        expect(out.map((m) => m.name).sort()).toEqual([
            "Kuala Lumpur, Malaysia",
            "Manila US Embassy, Philippines",
        ]);
        expect(mergeStaleIntoOverview(bounds, [])).toBe(bounds); // identity kept
    });
});

describe("getWorldOverview (cold-path coalescing — one crawl per cold wave)", () => {
    const realFetch = globalThis.fetch;

    beforeAll(() => {
        setWaqiRetryDelayForTests(5); // failure-path retries run in ms here
        setWaqiPaceIntervalForTests(0); // the 1,512-call crawl must not sleep
    });

    afterEach(() => {
        globalThis.fetch = realFetch;
        resetWorldOverviewForTests();
        resetStaleStationsForTests(); // the refresh() path sweeps the registry too
    });

    it("serves concurrent cold callers from a single crawl", async () => {
        resetWorldOverviewForTests();
        resetStaleStationsForTests();
        let calls = 0;
        globalThis.fetch = (async () => {
            calls += 1;
            return new Response(JSON.stringify({ status: "ok", data: [] }), {
                status: 200,
            });
        }) as unknown as typeof fetch;
        const [a, b] = await Promise.all([
            getWorldOverview("tok"),
            getWorldOverview("tok"),
        ]);
        // One crawl: 72 grid cells × 21 nodes (30° → 15° → 7.5°) — plus ONE
        // coalesced stale-registry sweep (COUNTRY_KEYWORDS search calls, no
        // feed rows because every stubbed response is empty). Two parallel
        // crawls would double either number and double upstream volume.
        expect(calls).toBe(72 * 21 + COUNTRY_KEYWORDS.length);
        expect(a.stations).toBe(b.stations); // same underlying result
        expect(a.stale).toBe(false);
        expect(b.stale).toBe(false);
    });

    it("rejects every concurrent cold caller when the refresh fails", async () => {
        resetWorldOverviewForTests();
        globalThis.fetch = (async () => {
            throw new Error("upstream down");
        }) as unknown as typeof fetch;
        const results = await Promise.allSettled([
            getWorldOverview("tok"),
            getWorldOverview("tok"),
        ]);
        expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    });
});
