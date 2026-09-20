// Jeleboo — tests for the worldwide explore hook's pure helpers (Card 17):
// the zoom gate and the Leaflet-corners → viewport conversion.

import { describe, it, expect } from "bun:test";
import { queryZoomGate, viewportFromCorners } from "./useMapView";

describe("queryZoomGate (the confirmed zoom >= 4 rule)", () => {
    it("fires at zoom 4 and above", () => {
        expect(queryZoomGate(4)).toBe(true);
        expect(queryZoomGate(6)).toBe(true);
        expect(queryZoomGate(18)).toBe(true);
    });

    it("does not fire below zoom 4", () => {
        expect(queryZoomGate(3.9)).toBe(false);
        expect(queryZoomGate(0)).toBe(false);
    });

    it("does not fire without a zoom reading", () => {
        expect(queryZoomGate(null)).toBe(false);
        expect(queryZoomGate(undefined)).toBe(false);
        expect(queryZoomGate(NaN)).toBe(false);
    });
});

describe("viewportFromCorners", () => {
    it("maps Leaflet's SW/NE corners into an order-A viewport", () => {
        expect(viewportFromCorners(40.3, -74.6, 41.0, -73.5)).toEqual({
            lat1: 40.3,
            lng1: -74.6,
            lat2: 41.0,
            lng2: -73.5,
        });
    });
});
