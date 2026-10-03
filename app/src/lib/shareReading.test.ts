// Jeleboo — tests for the share payload (Card 23): exact wording, honest age,
// platform gate.

import { describe, it, expect } from "bun:test";
import { buildSharePayload, canShareReading, SHARE_URL } from "./shareReading";
import type { Reading } from "../hooks/useReading";

const reading: Reading = {
    aqi_value: 63,
    station_name: "Kuala Lumpur",
    source: "waqi",
    scale: "us_aqi",
    recorded_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
    last_updated_minutes_ago: 30,
    lat: 3.14,
    lng: 101.69,
    via: "coordinate",
};

describe("buildSharePayload", () => {
    it("carries the exact design.md wording: title, band-labelled text, age, url", () => {
        const p = buildSharePayload(reading);
        expect(p.title).toBe("Jeleboo — AQI 63");
        expect(p.text).toContain("AQI 63 (Moderate) in Kuala Lumpur");
        expect(p.text).toContain("updated 30 min ago");
        expect(p.text).toContain("via Jeleboo");
        expect(p.url).toBe(SHARE_URL);
    });

    it("rounds the AQI and matches the band label to the value", () => {
        const p = buildSharePayload({ ...reading, aqi_value: 116.4 });
        expect(p.title).toBe("Jeleboo — AQI 116");
        expect(p.text).toContain("(Unhealthy for Sensitive Groups)");
    });
});

describe("canShareReading", () => {
    it("is a plain boolean gate (typeof navigator.share)", () => {
        expect(typeof canShareReading()).toBe("boolean");
    });
});
