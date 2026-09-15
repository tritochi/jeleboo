// Jeleboo — tests for the Map & Station Explorer data layer (Card 11):
// /search response normalization, the MY-only country guard, the Card 02
// coordinate fill-in, the state-keyword derivation, the six-band classifier,
// and the shared rate limiter. WAQI is never called here — pure functions.

import { describe, it, expect } from "bun:test";
import {
    normalizeSearchItem,
    buildStationSet,
    malaysiaStateKeywords,
    type RawStateResult,
    type RawSearchItem,
} from "../src/sources/stations";
import { classifyAqi } from "../src/theme/severity";
import { makeRateLimiter } from "../src/lib/rate-limit";

function item(overrides: Partial<RawSearchItem> = {}): RawSearchItem {
    return {
        uid: 5780,
        aqi: 68,
        station: {
            name: "Kuala Lumpur",
            geo: [3.139003, 101.686855],
            country: "MY",
        },
        time: { v: 1789000000 },
        ...overrides,
    };
}

describe("malaysiaStateKeywords", () => {
    it("derives exactly 16 state keywords covering every state/territory", () => {
        // Malaysia has 13 states + 3 federal territories = 16. Card 02's "17"
        // counted raw slug segments, which included `undefined` from the four
        // bare slugs (ipoh, perai, miri, kuala-lumpur) — a counting artifact
        // corrected here. Labuan is covered by the "Wilayah Persekutuan"
        // keyword; "w.p.-putrajaya" normalizes to "Putrajaya".
        const states = malaysiaStateKeywords();
        expect(states.length).toBe(16);
        expect(states).toContain("Johor");
        expect(states).toContain("Negeri Sembilan");
        expect(states).toContain("Wilayah Persekutuan");
        expect(states).toContain("Putrajaya"); // "w.p.-putrajaya" normalized
        expect(states).toContain("Pulau Pinang");
    });
});

describe("normalizeSearchItem", () => {
    it("normalizes a valid Malaysian search result", () => {
        const m = normalizeSearchItem(item());
        expect(m).not.toBeNull();
        if (m) {
            expect(m.uid).toBe(5780);
            expect(m.name).toBe("Kuala Lumpur");
            expect(m.lat).toBeCloseTo(3.139003);
            expect(m.lng).toBeCloseTo(101.686855);
            expect(m.aqi).toBe(68);
            expect(m.band).toBe("moderate");
            expect(m.bandLabel).toBe("Moderate");
            expect(m.lastUpdated).toBe(new Date(1789000000 * 1000).toISOString());
        }
    });

    it("accepts a numeric-string aqi (154 → Unhealthy, 151–200)", () => {
        const m = normalizeSearchItem(item({ aqi: "154" }));
        expect(m?.aqi).toBe(154);
        expect(m?.band).toBe("unhealthy");
    });

    it("drops entries outside Malaysia (country guard)", () => {
        expect(normalizeSearchItem(item({ station: { name: "Medan", geo: [3.5, 98.6], country: "ID" } }))).toBeNull();
    });

    it("drops foreign entries that omit the country field, via the slug (found live)", () => {
        // Live probe 2026-09-15: /search?q=kuch matched "Kucharovice, ... Czech
        // Republic" — WAQI omitted the country field. The malaysia/ slug guard
        // is what keeps them out.
        expect(normalizeSearchItem(item({
            uid: 2783,
            station: { name: "Kucharovice, Jihomoravsky, Czech Republic", geo: [48.88, 16.08], url: "czech-republic/jihomoravsky/kucharovice" },
        }))).toBeNull();
    });

    it("keeps Malaysian entries that omit the country field, via the slug", () => {
        // Live probe: WAQI also omits country on Malaysian stations (e.g. Muar).
        const m = normalizeSearchItem(item({
            uid: 2579,
            station: { name: "Muar, Johor, Malaysia", geo: [2.061969, 102.593131], url: "malaysia/johor/muar" },
        }));
        expect(m).not.toBeNull();
        expect(m?.name).toBe("Muar, Johor, Malaysia");
    });

    it("reads the measurement epoch from vtime (WAQI's actual field)", () => {
        const m = normalizeSearchItem(item({ time: { vtime: 1789452000 } }));
        expect(m?.lastUpdated).toBe(new Date(1789452000 * 1000).toISOString());
    });

    it("drops entries with no usable aqi (\"-\" or missing)", () => {
        expect(normalizeSearchItem(item({ aqi: "-" }))).toBeNull();
        expect(normalizeSearchItem(item({ aqi: undefined }))).toBeNull();
    });

    it("marks zero coordinates for the merge to fill (does not drop here)", () => {
        const m = normalizeSearchItem(item({ station: { name: "X", geo: [0, 0], country: "MY" } }));
        expect(m).not.toBeNull();
        expect(m?.lat).toBe(0);
        expect(m?.lng).toBe(0);
    });

    it("returns null for null / malformed input", () => {
        expect(normalizeSearchItem(null as unknown as RawSearchItem)).toBeNull();
        expect(normalizeSearchItem({} as RawSearchItem)).toBeNull();
    });
});

describe("buildStationSet", () => {
    const kl = item(); // uid 5780 — in the Card 02 table
    const kuching = item({ uid: 2610, aqi: "154", station: { name: "Kuching, Sarawak, Malaysia", geo: [1.562229, 110.388958], country: "MY" } });
    const noCoords = item({ uid: 2612, station: { name: "Miri", geo: [0, 0], country: "MY" } }); // uid 2612 = Miri in the table
    const foreign = item({ uid: 999999, station: { name: "Singapore", geo: [1.35, 103.82], country: "SG" } });
    const unknownUidNoCoords = item({ uid: 123456789, station: { name: "Nowhere", geo: [0, 0], country: "MY" } });

    it("merges states, dedupes by uid, and fills coordinates from the Card 02 table", () => {
        const results: RawStateResult[] = [
            { state: "Kuala Lumpur", ok: true, items: [kl] },
            { state: "Sarawak", ok: true, items: [kuching, noCoords] },
        ];
        const set = buildStationSet(results, "2026-09-15T00:00:00.000Z", false);
        expect(set.stations.length).toBe(3);
        expect(set.failedStates).toEqual([]);
        const miri = set.stations.find((s) => s.name === "Miri");
        expect(miri).toBeDefined();
        expect(miri?.lat).toBeCloseTo(4.424679); // filled from the table, not 0
        expect(miri?.lng).toBeCloseTo(114.012426);
    });

    it("drops unplaceable stations (no coords, uid not in the table)", () => {
        const set = buildStationSet([{ state: "X", ok: true, items: [unknownUidNoCoords] }], "2026-09-15T00:00:00.000Z", false);
        expect(set.stations.length).toBe(0);
    });

    it("records failed states and keeps the successful ones (partial set)", () => {
        const results: RawStateResult[] = [
            { state: "Johor", ok: false },
            { state: "Perlis", ok: false },
            { state: "Sarawak", ok: true, items: [kuching] },
        ];
        const set = buildStationSet(results, "2026-09-15T00:00:00.000Z", false);
        expect(set.failedStates).toEqual(["Johor", "Perlis"]);
        expect(set.stations.length).toBe(1);
    });

    it("never lets a foreign station through, even without matching a table uid", () => {
        const set = buildStationSet([{ state: "X", ok: true, items: [foreign] }], "2026-09-15T00:00:00.000Z", false);
        expect(set.stations.length).toBe(0);
    });
});

describe("classifyAqi (server-side six-band mirror)", () => {
    it("matches the confirmed six-band boundaries", () => {
        expect(classifyAqi(50).band).toBe("good");
        expect(classifyAqi(51).band).toBe("moderate");
        expect(classifyAqi(100).band).toBe("moderate");
        expect(classifyAqi(101).band).toBe("usg");
        expect(classifyAqi(150).band).toBe("usg");
        expect(classifyAqi(151).band).toBe("unhealthy");
        expect(classifyAqi(200).band).toBe("unhealthy");
        expect(classifyAqi(201).band).toBe("very-unhealthy");
        expect(classifyAqi(299).band).toBe("very-unhealthy");
        expect(classifyAqi(300).band).toBe("hazardous");
    });

    it("labels every band (color is never alone)", () => {
        expect(classifyAqi(20).label).toBe("Good");
        expect(classifyAqi(320).label).toBe("Hazardous");
        expect(classifyAqi(120).label).toBe("Unhealthy for Sensitive Groups");
    });
});

describe("makeRateLimiter (shared)", () => {
    it("allows up to the limit then blocks within the window", () => {
        const allow = makeRateLimiter(3, 60_000);
        expect(allow("1.2.3.4")).toBe(true);
        expect(allow("1.2.3.4")).toBe(true);
        expect(allow("1.2.3.4")).toBe(true);
        expect(allow("1.2.3.4")).toBe(false);
    });

    it("tracks IPs independently", () => {
        const allow = makeRateLimiter(1, 60_000);
        expect(allow("5.5.5.5")).toBe(true);
        expect(allow("5.5.5.5")).toBe(false);
        expect(allow("6.6.6.6")).toBe(true);
    });
});

