// Jeleboo — tests for the stale-station registry (builder decision
// 2026-09-30): candidate extraction, feed → marker mapping, box filtering,
// search enrichment, and the cached country-sweep. No network — global
// fetch is stubbed, pacing/retries zeroed.

import { describe, it, expect, afterEach, beforeAll } from "bun:test";
import {
    candidateFromRow,
    markerFromFeed,
    markersInBox,
    enrichStaleSuggestions,
    getStaleStations,
    resetStaleStationsForTests,
    COUNTRY_KEYWORDS,
    type StaleCandidate,
} from "../src/sources/stale-stations";
import {
    setWaqiRetryDelayForTests,
    setWaqiPaceIntervalForTests,
} from "../src/sources/waqi";

const realFetch = globalThis.fetch;

beforeAll(() => {
    setWaqiRetryDelayForTests(5);
    setWaqiPaceIntervalForTests(0);
});

afterEach(() => {
    globalThis.fetch = realFetch;
    resetStaleStationsForTests();
});

function stubFetch(fn: (url: string) => Response): void {
    globalThis.fetch = (async (url: unknown) => fn(String(url))) as unknown as typeof fetch;
}

function resp(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

function row(over: Record<string, unknown> = {}) {
    return {
        uid: 14893,
        aqi: "-",
        station: {
            name: "Manila US Embassy, Philippines",
            geo: [14.57711, 120.9778],
            url: "philippines/manila/us-embassy",
        },
        time: { vtime: 1770339600 },
        ...over,
    };
}

const candidate: StaleCandidate = {
    uid: 14893,
    name: "Manila US Embassy, Philippines",
    lat: 14.57711,
    lng: 120.9778,
    url: "philippines/manila/us-embassy",
    liveAqi: null,
};

describe("candidateFromRow", () => {
    it("accepts a coordinate-bearing aqi:\"-\" row with a feed slug", () => {
        const c = candidateFromRow(row() as never);
        expect(c).not.toBeNull();
        expect(c?.uid).toBe(14893);
        expect(c?.liveAqi).toBeNull();
        expect(c?.url).toBe("philippines/manila/us-embassy");
    });

    it("flags a live numeric aqi", () => {
        expect(candidateFromRow(row({ aqi: 96 }) as never)?.liveAqi).toBe(96);
    });

    it("drops rows without coordinates, uid, or name", () => {
        expect(candidateFromRow(row({ station: { name: "X" } }) as never)).toBeNull();
        expect(candidateFromRow(row({ station: { name: "X", geo: [0, 0] } }) as never)).toBeNull();
        expect(candidateFromRow(row({ uid: "nope" }) as never)).toBeNull();
        expect(candidateFromRow(row({ station: { geo: [1, 2] } }) as never)).toBeNull();
    });
});

describe("markerFromFeed", () => {
    it("builds a dated marker from a live-value feed response", () => {
        const m = markerFromFeed(candidate, {
            aqi: 116,
            idx: 14893,
            city: { name: "Manila US Embassy, Philippines", geo: [14.57711, 120.9778] },
            time: { iso: "2026-02-06T01:00:00+08:00" },
        });
        expect(m).not.toBeNull();
        expect(m?.aqi).toBe(116);
        expect(m?.band).toBe("usg"); // 101–150
        expect(m?.lastUpdated).toBe("2026-02-06T01:00:00+08:00"); // the REAL date
        expect(m?.uid).toBe(14893);
        expect(m?.lat).toBeCloseTo(14.57711);
    });

    it("returns null when the feed has no numeric aqi either", () => {
        expect(markerFromFeed(candidate, { aqi: "-" })).toBeNull();
        expect(markerFromFeed(candidate, null)).toBeNull();
        expect(markerFromFeed(candidate, { aqi: "nope" })).toBeNull();
    });

    it("falls back to feed coordinates when the candidate has none", () => {
        const c = { ...candidate, lat: 0, lng: 0 };
        const m = markerFromFeed(c, {
            aqi: 107,
            city: { geo: [4.9311206, 114.9516869] },
            time: { iso: "2026-09-07T16:00:00+08:00" },
        });
        expect(m?.lat).toBeCloseTo(4.9311206);
        expect(m?.lng).toBeCloseTo(114.9516869);
    });
});

describe("markersInBox", () => {
    const m = (lat: number, lng: number) => ({
        uid: 1, name: "x", lat, lng, aqi: 10, band: "good" as const,
        bandLabel: "Good", lastUpdated: "2026-09-30T00:00:00Z",
    });
    it("keeps markers inside (inclusive edges) and drops the rest", () => {
        const box = { lat1: 14, lng1: 120, lat2: 15, lng2: 122 };
        const out = markersInBox([m(14.5, 121), m(13.9, 121), m(14.5, 122.1), m(14, 120)], box);
        expect(out.length).toBe(2);
    });
});

describe("enrichStaleSuggestions", () => {
    it("resolves only stale coordinate-bearing rows with feeds, capped, in order", async () => {
        let feedCalls = 0;
        stubFetch((url) => {
            if (!url.includes("/feed/")) return resp(500);
            feedCalls += 1;
            return resp(200, {
                status: "ok",
                data: { aqi: 77, city: { geo: [14.5, 121] }, time: { iso: "2026-09-01T00:00:00+08:00" } },
            });
        });
        const rows = [
            row({ uid: 1, aqi: 55 }), // live → handled elsewhere, not enriched
            row({ uid: 2 }), // stale with url → feed
            row({ uid: 3, station: { name: "No slug", geo: [1, 2] } }), // no url → skip
            row({ uid: 4, station: { name: "No geo", url: "x/y" } }), // no geo → skip
        ];
        const out = await enrichStaleSuggestions(rows as never, "tok", 5);
        expect(feedCalls).toBe(1);
        expect(out.length).toBe(1);
        expect(out[0].aqi).toBe(77);
    });

    it("skips rows whose feed also has no value", async () => {
        stubFetch(() => resp(200, { status: "ok", data: { aqi: "-" } }));
        const out = await enrichStaleSuggestions([row()] as never, "tok", 5);
        expect(out.length).toBe(0);
    });
});

describe("getStaleStations (country sweep → registry)", () => {
    it("combines live rows and feed-resolved stale rows, then serves from cache", async () => {
        let calls = 0;
        stubFetch((url) => {
            calls += 1;
            if (url.includes("keyword=Philippines")) {
                return resp(200, {
                    status: "ok",
                    data: [
                        row(), // stale → feed
                        row({ uid: 99, aqi: 42, station: { name: "Live PH", geo: [10, 120] } }),
                    ],
                });
            }
            if (url.includes("/feed/")) {
                return resp(200, {
                    status: "ok",
                    data: { aqi: 116, city: { geo: [14.5, 121] }, time: { iso: "2026-02-06T01:00:00+08:00" } },
                });
            }
            return resp(200, { status: "ok", data: [] });
        });
        const markers = await getStaleStations("tok");
        expect(markers.length).toBe(2);
        expect(markers.find((m) => m.uid === 14893)?.aqi).toBe(116);
        expect(markers.find((m) => m.uid === 99)?.aqi).toBe(42);
        expect(calls).toBe(COUNTRY_KEYWORDS.length + 1); // sweep + one feed
        const again = await getStaleStations("tok"); // fresh cache → no calls
        expect(again).toBe(markers);
        expect(calls).toBe(COUNTRY_KEYWORDS.length + 1);
    });
});

