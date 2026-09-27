// Jeleboo — tests for the worldwide map-view source (Cards 16 + 21). Pure
// functions only: no fetch, no DB, no clock (Card 21's collection tests use
// an injected fake fetchBox, still no network). Covers the bounds-item
// normalizer (a different shape from /search), the name-suffix MY filter
// (verified: bounds items carry no country/url fields), the Card-02 union
// (65/73 coverage → all 73 preserved), viewport validation/rounding, the
// span-cap removal, cell planning (clamp/wrap/cut), and the cell collector.

import { describe, it, expect } from "bun:test";
import {
    normalizeBoundsItem,
    isMalaysiaName,
    unionMy,
    normalizeViewport,
    viewportCacheKey,
    viewportIntersectsMyBox,
    planViewportCells,
    collectViewport,
    type RawBoundsItem,
    type Viewport,
} from "../src/sources/map-view";
import { MALAYSIA_CITY_STATIONS } from "../src/sources/city-stations";
import { BOUNDS_CAP } from "../src/sources/bounds";

function item(overrides: Partial<RawBoundsItem> = {}): RawBoundsItem {
    return {
        lat: 3.139003,
        lon: 101.686855,
        uid: 5780,
        aqi: "68",
        station: { name: "Kuala Lumpur", time: "2026-09-17T14:00:00+08:00" },
        ...overrides,
    };
}

describe("normalizeViewport", () => {
    it("accepts a valid order-A box", () => {
        const v = normalizeViewport({ lat1: 40.3, lng1: -74.6, lat2: 41.0, lng2: -73.5 });
        expect(v).toEqual({ lat1: 40.3, lng1: -74.6, lat2: 41.0, lng2: -73.5 });
    });

    it("rejects reversed edges and non-numbers", () => {
        expect(normalizeViewport({ lat1: 41, lng1: -74.6, lat2: 40.3, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({ lat1: 40.3, lng1: -74.6, lat2: 40.3, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({ lat1: "x", lng1: -74.6, lat2: 41, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({})).toBeNull();
    });

    it("accepts wide boxes — the ≤30° span cap is gone (Card 21)", () => {
        // 31° used to be rejected here (400 at the route); wide zoom-4–6
        // viewports are now valid and get clamped into ≤30° cells instead.
        expect(normalizeViewport({ lat1: 0, lng1: 0, lat2: 30, lng2: 30 })).not.toBeNull();
        expect(normalizeViewport({ lat1: 0, lng1: -74.6, lat2: 31, lng2: -73.5 })).not.toBeNull();
        expect(normalizeViewport({ lat1: 0, lng1: -60, lat2: 55, lng2: 60 })).not.toBeNull();
    });
});

describe("viewportCacheKey", () => {
    it("rounds to the 0.5-degree grid so near-identical viewports share a key", () => {
        const a = viewportCacheKey({ lat1: 40.31, lng1: -74.62, lat2: 41.02, lng2: -73.51 });
        const b = viewportCacheKey({ lat1: 40.26, lng1: -74.55, lat2: 40.99, lng2: -73.49 });
        expect(a).toBe(b);
        expect(a).toBe("40.5,-74.5,41,-73.5");
    });
});

describe("isMalaysiaName", () => {
    it("accepts names ending ', Malaysia' (any case)", () => {
        expect(isMalaysiaName("Kota Kinabalu, Sabah, Malaysia")).toBe(true);
        expect(isMalaysiaName("  Kuching, Sarawak, MALAYSIA ")).toBe(true);
    });

    it("rejects neighbors and non-MY names", () => {
        expect(isMalaysiaName("Batam, Indonesia")).toBe(false);
        expect(isMalaysiaName("Bandar Seri Begawan, Brunei")).toBe(false);
        expect(isMalaysiaName("Maspeth, New York, USA")).toBe(false);
        expect(isMalaysiaName("Malaysia")).toBe(false); // suffix required
    });
});

describe("normalizeBoundsItem", () => {
    it("normalizes a valid bounds item (string aqi, top-level lat/lon, ISO time)", () => {
        const m = normalizeBoundsItem(item());
        expect(m).not.toBeNull();
        if (m) {
            expect(m.uid).toBe(5780);
            expect(m.name).toBe("Kuala Lumpur");
            expect(m.lat).toBeCloseTo(3.139003);
            expect(m.lng).toBeCloseTo(101.686855);
            expect(m.aqi).toBe(68);
            expect(m.band).toBe("moderate");
            expect(m.lastUpdated).toBe("2026-09-17T14:00:00+08:00");
        }
    });

    it("skips entries without a usable aqi or name", () => {
        expect(normalizeBoundsItem(item({ aqi: "-" }))).toBeNull();
        expect(normalizeBoundsItem(item({ station: { name: undefined, time: undefined } }))).toBeNull();
        expect(normalizeBoundsItem(item({ station: { name: "", time: undefined } }))).toBeNull();
    });

    it("skips items with 0,0 coordinates (unplaceable)", () => {
        expect(normalizeBoundsItem(item({ lat: 0, lon: 0 }))).toBeNull();
    });
});

describe("viewportIntersectsMyBox", () => {
    it("is true for viewports overlapping Malaysia", () => {
        // Tight KL box
        expect(viewportIntersectsMyBox({ lat1: 2.9, lng1: 101.4, lat2: 3.4, lng2: 102.0 })).toBe(true);
        // Peninsular test box
        expect(viewportIntersectsMyBox({ lat1: 1.0, lng1: 99.5, lat2: 6.8, lng2: 105.0 })).toBe(true);
        // Huge box that spans the whole region
        expect(viewportIntersectsMyBox({ lat1: -10, lng1: 90, lat2: 30, lng2: 130 })).toBe(true);
    });

    it("is false for viewports nowhere near Malaysia (the NY-box bug guard)", () => {
        // NY metro — the exact box whose response wrongly included 73 MY
        // stations before this gate existed
        expect(viewportIntersectsMyBox({ lat1: 40.3, lng1: -74.6, lat2: 41.0, lng2: -73.5 })).toBe(false);
        // Delhi
        expect(viewportIntersectsMyBox({ lat1: 28.2, lng1: 76.8, lat2: 29.2, lng2: 78.6 })).toBe(false);
    });

    it("uses inclusive edges (a box just touching Malaysia counts)", () => {
        expect(viewportIntersectsMyBox({ lat1: 5, lng1: 100, lat2: 10, lng2: 105 })).toBe(true);
    });
});

describe("unionMy", () => {
    // Normalized markers, as unionMy expects (raw items are normalized first).
    const kl = normalizeBoundsItem(item())!; // uid 5780, in the table
    kl.name = "Kuala Lumpur, Malaysia"; // bounds names carry the country suffix
    const batam = normalizeBoundsItem(item({
        uid: 9999,
        station: { name: "Batam, Indonesia", time: "2026-09-17T14:00:00+08:00" },
        lat: 1.1,
        lon: 104.1,
    }))!;
    const miri = normalizeBoundsItem(item({
        uid: 2612,
        aqi: "51",
        station: { name: "ILP Miri, Sarawak, Malaysia", time: "2026-09-17T14:00:00+08:00" },
        lat: 4.44,
        lon: 114.01,
    }))!;

    it("keeps only MY-name items; markers ∪ tableOnly cover all 73 (65/73 rule)", () => {
        const { markers, tableOnly } = unionMy([kl, batam, miri]);
        // markers = the bounds-MY items (kl + miri); tableOnly = the 71 table
        // stations bounds missed. Together they cover all 73; Batam drops.
        expect(markers.length).toBe(2);
        expect(tableOnly.length).toBe(71);
        const uids = new Set([...markers.map((m) => m.uid), ...tableOnly.map((t) => t.uid)]);
        for (const s of MALAYSIA_CITY_STATIONS) {
            expect(uids.has(s.uid)).toBe(true);
        }
        expect(uids.has(9999)).toBe(false); // Batam dropped
        expect(uids.size).toBe(73); // full coverage, no dupes
    });

    it("lists table stations missing from bounds as table-only (slug-fetch queue)", () => {
        const { tableOnly } = unionMy([kl]);
        // With only KL in bounds, every table station except uid 5780 is
        // table-only — including the 8 uids verified missing from the live
        // Peninsular+Borneo boxes (Muar 2579 … US Embassy 14721).
        expect(tableOnly.length).toBe(72);
        const ids = tableOnly.map((t) => t.uid);
        for (const uid of [2579, 2584, 2594, 2602, 2626, 2628, 5778, 14721]) {
            expect(ids).toContain(uid);
        }
        expect(ids).not.toContain(5780);
    });

    it("overlays Card-02 table coordinates when a uid matches", () => {
        const shifted = normalizeBoundsItem(item({
            lat: 9.99,
            lon: 9.99,
            station: { name: "Kuala Lumpur, Malaysia", time: "2026-09-17T14:00:00+08:00" },
        }))!; // same uid 5780, wrong coords, MY suffix so it is selected
        const { markers } = unionMy([shifted]);
        expect(markers.length).toBe(1);
        expect(markers[0].lat).toBeCloseTo(3.139003); // table coords win
        expect(markers[0].lng).toBeCloseTo(101.686855);
    });
});

describe("planViewportCells (Card 21 — clamp, wrap, ≤30° cut)", () => {
    const cells = (v: Partial<Viewport>) => planViewportCells(v as Viewport);

    it("returns a single cell for a box already within 30° per side", () => {
        const out = cells({ lat1: 40, lng1: -74, lat2: 41, lng2: -73 });
        expect(out).toEqual([{ lat1: 40, lng1: -74, lat2: 41, lng2: -73 }]);
    });

    it("cuts a wide box into ≤30° cells that tile it exactly", () => {
        const out = cells({ lat1: 0, lng1: -60, lat2: 60, lng2: 60 }); // 60° × 120°
        expect(out.length).toBe(8); // 2 lat rows × 4 lng cols
        for (const c of out) {
            expect(c.lat2 - c.lat1).toBeLessThanOrEqual(30);
            expect(c.lng2 - c.lng1).toBeLessThanOrEqual(30);
            expect(c.lat1).toBeGreaterThanOrEqual(0);
            expect(c.lat2).toBeLessThanOrEqual(60);
            expect(c.lng1).toBeGreaterThanOrEqual(-60);
            expect(c.lng2).toBeLessThanOrEqual(60);
        }
        // Exact coverage: rows tile lat, cols tile lng — no gaps.
        const latStarts = [...new Set(out.map((c) => c.lat1))].sort((a, b) => a - b);
        expect(latStarts).toEqual([0, 30]);
        const lngStarts = [...new Set(out.map((c) => c.lng1))].sort((a, b) => a - b);
        expect(lngStarts).toEqual([-60, -30, 0, 30]);
    });

    it("splits a box crossing the antimeridian into in-range cells", () => {
        const out = cells({ lat1: 0, lng1: 170, lat2: 20, lng2: 190 });
        expect(out.length).toBe(2);
        for (const c of out) {
            expect(c.lng1).toBeGreaterThanOrEqual(-180);
            expect(c.lng2).toBeLessThanOrEqual(180);
        }
        const totalLng = out.reduce((sum, c) => sum + (c.lng2 - c.lng1), 0);
        expect(totalLng).toBeCloseTo(20); // full 20° span, no double coverage
        expect(out.map((c) => c.lng1).sort((a, b) => a - b)).toEqual([-180, 170]);
    });

    it("collapses a ≥360° span to the whole world", () => {
        const out = cells({ lat1: 0, lng1: -200, lat2: 10, lng2: 200 });
        expect(out.length).toBe(12); // one lat row × twelve 30° columns
        expect(Math.min(...out.map((c) => c.lng1))).toBe(-180);
        expect(Math.max(...out.map((c) => c.lng2))).toBe(180);
    });

    it("clamps latitude to the poles and returns nothing for out-of-world boxes", () => {
        const clamped = cells({ lat1: -100, lng1: 0, lat2: -50, lng2: 20 });
        expect(clamped.length).toBe(2); // −90..−50 = 40° → 2 lat rows × 1 col
        for (const c of clamped) {
            expect(c.lat1).toBeGreaterThanOrEqual(-90);
            expect(c.lat2).toBeLessThanOrEqual(-50);
        }
        expect(cells({ lat1: -100, lng1: 0, lat2: -95, lng2: 20 })).toEqual([]);
    });
});

describe("collectViewport (Card 21 — cell fetch, cap sub-division, failures)", () => {
    const marker = (uid: number) => ({
        uid,
        name: `Station ${uid}`,
        lat: 1,
        lng: 2,
        aqi: 50,
        band: "good" as const,
        bandLabel: "Good",
        lastUpdated: "2026-09-27T00:00:00Z",
    });

    it("sub-divides a capped cell instead of truncating at 1,024", async () => {
        const calls: number[] = [];
        const result = await collectViewport(
            { lat1: 30, lng1: 0, lat2: 60, lng2: 30 }, // exactly one 30° cell
            async (box) => {
                const count = box.lat2 - box.lat1 >= 30 ? BOUNDS_CAP : 50;
                calls.push(count);
                return Array.from({ length: count }, (_, i) => marker(i));
            }
        );
        // depth 0 hits the cap → four 15° quadrants at 50 each replace it.
        expect(calls.length).toBe(5);
        expect(result.markers.length).toBe(4 * 50);
        expect(result.cellCount).toBe(1);
        expect(result.failedCells).toBe(0);
    });

    it("fans a wide viewport out across its cells", async () => {
        const boxes: Array<{ lat1: number; lng1: number; lat2: number; lng2: number }> = [];
        const result = await collectViewport(
            { lat1: 0, lng1: -60, lat2: 60, lng2: 60 }, // 8 cells
            async (box) => {
                boxes.push(box);
                return [marker(boxes.length)];
            }
        );
        expect(result.cellCount).toBe(8);
        expect(result.markers.length).toBe(8);
        expect(result.failedCells).toBe(0);
        expect(boxes.every((b) => b.lat2 - b.lat1 <= 30 && b.lng2 - b.lng1 <= 30)).toBe(true);
    });

    it("counts cell failures without losing the cells that succeeded", async () => {
        let n = 0;
        const result = await collectViewport(
            { lat1: 0, lng1: -60, lat2: 60, lng2: 60 }, // 8 cells
            async () => {
                const i = n++;
                if (i === 0) throw new Error("upstream hiccup");
                return [marker(i)];
            }
        );
        expect(result.cellCount).toBe(8);
        expect(result.failedCells).toBe(1);
        expect(result.markers.length).toBe(7);
    });
});
