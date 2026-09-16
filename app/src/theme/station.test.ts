// Jeleboo — tests for the city-change detection helper (Card 14). Pure
// functions only: no fetch, no geolocation, no storage.

import { describe, it, expect } from "bun:test";
import { stationChanged } from "../hooks/useReading";

describe("stationChanged", () => {
    it("is false on a first-ever load (no previous station)", () => {
        expect(stationChanged(null, "Kuala Lumpur")).toBe(false);
        expect(stationChanged(undefined, "Kuala Lumpur")).toBe(false);
        expect(stationChanged("", "Kuala Lumpur")).toBe(false);
    });

    it("is false when the station is unchanged", () => {
        expect(stationChanged("Kuala Lumpur", "Kuala Lumpur")).toBe(false);
    });

    it("is true when the resolved station differs", () => {
        expect(stationChanged("Kuala Lumpur", "Cheras, Kuala Lumpur, Wilayah Persekutuan, Malaysia")).toBe(true);
    });

    it("is exact-match (no case or whitespace folding — stations come verbatim)", () => {
        expect(stationChanged("kuala lumpur", "Kuala Lumpur")).toBe(true);
    });

    it("is false for an unusable next name (nothing to hint about)", () => {
        expect(stationChanged("Kuala Lumpur", "")).toBe(false);
        expect(stationChanged("Kuala Lumpur", undefined as unknown as string)).toBe(false);
    });
});
