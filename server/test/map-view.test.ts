// Jeleboo — tests for the worldwide map-view source (Card 16). Pure
// functions only: no fetch, no DB, no clock. Covers the bounds-item
// normalizer (a different shape from /search), the name-suffix MY filter
// (verified: bounds items carry no country/url fields), the Card-02 union
// (65/73 coverage → all 73 preserved), viewport validation/rounding.

import { describe, it, expect } from "bun:test";
import {
    normalizeBoundsItem,
    isMalaysiaName,
    unionMy,
    normalizeViewport,
    viewportCacheKey,
    viewportIntersectsMyBox,
    type RawBoundsItem,
} from "../src/sources/map-view";
import { MALAYSIA_CITY_STATIONS } from "../src/sources/city-stations";

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

    it("rejects reversed edges, non-numbers, and oversized boxes", () => {
        expect(normalizeViewport({ lat1: 41, lng1: -74.6, lat2: 40.3, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({ lat1: 40.3, lng1: -74.6, lat2: 40.3, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({ lat1: "x", lng1: -74.6, lat2: 41, lng2: -73.5 })).toBeNull();
        expect(normalizeViewport({})).toBeNull();
        // 31 degrees per side → over the cap
        expect(normalizeViewport({ lat1: 0, lng1: -74.6, lat2: 31, lng2: -73.5 })).toBeNull();
    });

    it("accepts a box exactly 30 degrees per side", () => {
        expect(normalizeViewport({ lat1: 0, lng1: 0, lat2: 30, lng2: 30 })).not.toBeNull();
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
