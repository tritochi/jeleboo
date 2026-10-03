// Jeleboo — bun test for the WAQI response parser and the city fallback.
// Per architecture.md's Testing Strategy, these are written as part of the
// card that introduces the behaviour, not as a later cleanup pass.

import { describe, it, expect } from "bun:test";
import { parseWaqiResponse, isUnknownStation } from "../src/sources/waqi";
import { nearestCityStation, MALAYSIA_CITY_STATIONS } from "../src/sources/city-stations";

describe("parseWaqiResponse", () => {
    it("parses a valid WAQI nearest-station response", () => {
        const raw = {
            status: "ok",
            data: {
                aqi: 42,
                time: { iso: "2026-09-09T23:00:00+00:00" },
                city: { name: "Kuala Lumpur" },
                idx: { lat: 3.139, lng: 101.6869 },
            },
        };
        const result = parseWaqiResponse(raw, "coordinate");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.source).toBe("waqi");
            expect(result.data.aqi_value).toBe(42);
            expect(result.data.station_name).toBe("Kuala Lumpur");
            expect(result.data.scale).toBe("us_aqi");
            expect(result.data.recorded_at).toBe("2026-09-09T23:00:00+00:00");
            expect(result.data.lat).toBe(3.139);
            expect(result.data.lng).toBe(101.6869);
            expect(result.data.via).toBe("coordinate");
        }
    });

    it("falls back to city_name when city.name is absent", () => {
        const raw = {
            status: "ok",
            data: { aqi: 15, city_name: "Petaling Jaya" },
        };
        const result = parseWaqiResponse(raw, "city");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.source).toBe("waqi");
            expect(result.data.station_name).toBe("Petaling Jaya");
            expect(result.data.scale).toBe("us_aqi");
            expect(result.data.via).toBe("city");
        }
    });

    it("returns a clear error for an upstream error response", () => {
        const raw = { status: "error", message: "invalid key" };
        const result = parseWaqiResponse(raw);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain("invalid key");
        }
    });

    it("returns a clear error when aqi is missing or non-numeric", () => {
        const raw = { status: "ok", data: { city: { name: "X" } } };
        const result = parseWaqiResponse(raw);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toContain("numeric aqi");
        }
    });

    it("returns a clear error for null / non-object input", () => {
        expect(parseWaqiResponse(null).ok).toBe(false);
        expect(parseWaqiResponse("string").ok).toBe(false);
        expect(parseWaqiResponse(undefined).ok).toBe(false);
    });

    it("never throws on malformed input", () => {
        expect(() => parseWaqiResponse({ status: "ok" })).not.toThrow();
        expect(() => parseWaqiResponse({})).not.toThrow();
    });
});

describe("isUnknownStation", () => {
    it("recognises WAQI's coordinate-endpoint failure shape", () => {
        expect(isUnknownStation({ status: "error", data: "Unknown station" })).toBe(true);
    });

    it("rejects a normal error response", () => {
        expect(isUnknownStation({ status: "error", message: "invalid key" })).toBe(false);
    });

    it("rejects a successful response", () => {
        expect(isUnknownStation({ status: "ok", data: {} })).toBe(false);
    });
});

describe("nearestCityStation", () => {
    it("returns the nearest station for a central KL coordinate", () => {
        const s = nearestCityStation(3.139, 101.6869);
        expect(s).not.toBeNull();
        if (s) {
            expect(s.slug).toBe("kuala-lumpur");
        }
    });

    it("returns the nearest station for a Sarawak coordinate", () => {
        const s = nearestCityStation(1.56, 110.38);
        expect(s).not.toBeNull();
        if (s) {
            expect(s.slug).toBe("malaysia/sarawak/kuching");
        }
    });

    it("returns the nearest station for a Sabah coordinate", () => {
        const s = nearestCityStation(5.89, 116.04);
        expect(s).not.toBeNull();
        if (s) {
            expect(s.slug).toBe("malaysia/sabah/kota-kinabalu");
        }
    });

    it("returns the nearest station for a Perlis coordinate", () => {
        const s = nearestCityStation(6.43, 100.21);
        expect(s).not.toBeNull();
        if (s) {
            expect(s.slug).toBe("malaysia/perlis/kangar");
        }
    });

    it("covers all Malaysian states + federal territories (73 stations)", () => {
        expect(MALAYSIA_CITY_STATIONS.length).toBe(73);
        // Card 11 correction: this used to count 17 because bare slugs
        // (ipoh, perai, miri, kuala-lumpur) contribute an `undefined` segment.
        // Malaysia has 16 states/territories in this table.
        const states = new Set(
            MALAYSIA_CITY_STATIONS
                .map((s) => s.slug.split("/")[1])
                .filter((seg): seg is string => !!seg)
        );
        expect(states.size).toBe(16);
    });
});