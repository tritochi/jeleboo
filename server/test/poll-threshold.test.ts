// Jeleboo — bun test for the threshold/hysteresis logic and the 300+
// hazardous flag. Per architecture.md's Testing Strategy, these are written
// as part of the card that introduces the behaviour, not as a later cleanup.
//
// `evaluateThreshold` is pure and deterministic, so it is tested directly
// without a database or network.

import { describe, it, expect } from "bun:test";
import { evaluateThreshold, HAZARDOUS_THRESHOLD, HYSTERESIS_BUFFER } from "../src/jobs/poll";

function device(overrides: Partial<{
    default_threshold: number | null;
    critical_alerts_enabled: boolean;
}> = {}) {
    return {
        id: "dev-test",
        push_subscription: "{}",
        default_threshold: 100,
        critical_alerts_enabled: 1,
        last_lat: null,
        last_lng: null,
        created_at: new Date().toISOString(),
        ...overrides,
    } as any;
}

function reading(aqi: number) {
    return {
        source: "waqi" as const,
        aqi_value: aqi,
        station_name: "Test Station",
        scale: "us_aqi" as const,
        recorded_at: new Date().toISOString(),
        lat: 0,
        lng: 0,
        via: "city" as const,
    };
}

// The previous notification is { state, threshold_value }, so a hazardous
// alert and a personal alert are distinguishable even though the state
// column only stores crossed_above/cleared.
const none = null;
const crossed = (thresholdValue: number) => ({ state: "crossed_above" as const, threshold_value: thresholdValue });

describe("evaluateThreshold", () => {
    it("fires when a reading crosses above the threshold", () => {
        const d = device({ default_threshold: 100 });
        expect(evaluateThreshold(d, reading(150), none)).toEqual({
            state: "crossed_above", threshold_value: 100,
        });
    });

    it("does not fire when the reading is below the threshold", () => {
        const d = device({ default_threshold: 100 });
        expect(evaluateThreshold(d, reading(80), none)).toBe(null);
    });

    it("does not re-fire while the reading stays above the threshold (hysteresis)", () => {
        const d = device({ default_threshold: 100 });
        // First crossing fires.
        expect(evaluateThreshold(d, reading(150), none)).toEqual({
            state: "crossed_above", threshold_value: 100,
        });
        // Still above — must not fire again.
        expect(evaluateThreshold(d, reading(160), crossed(100))).toBe(null);
        expect(evaluateThreshold(d, reading(200), crossed(100))).toBe(null);
    });

    it("does not fire for a value sitting right at the line (hysteresis buffer)", () => {
        const d = device({ default_threshold: 100 });
        // threshold + buffer = 115, so 110 is "at the line" and must not fire.
        expect(evaluateThreshold(d, reading(110), none)).toBe(null);
    });

    it("clears only after the reading drops below threshold − buffer", () => {
        const d = device({ default_threshold: 100 });
        // threshold − buffer = 85, so 90 is still "above the clear line".
        expect(evaluateThreshold(d, reading(90), crossed(100))).toBe(null);
        // 80 is below the clear line — should clear.
        expect(evaluateThreshold(d, reading(80), crossed(100))).toEqual({
            state: "cleared", threshold_value: 100,
        });
    });

    it("does not clear until the reading drops below threshold − buffer", () => {
        const d = device({ default_threshold: 100 });
        expect(evaluateThreshold(d, reading(95), crossed(100))).toBe(null);
    });

    it("the 300+ hazardous flag fires regardless of the personal threshold", () => {
        const low = device({ default_threshold: 50 });
        expect(evaluateThreshold(low, reading(HAZARDOUS_THRESHOLD), none)).toEqual({
            state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD,
        });
        expect(evaluateThreshold(low, reading(HAZARDOUS_THRESHOLD + 50), none)).toEqual({
            state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD,
        });
    });

    it("the hazardous flag does not re-fire while the reading stays hazardous (hysteresis)", () => {
        const low = device({ default_threshold: 50 });
        expect(evaluateThreshold(low, reading(HAZARDOUS_THRESHOLD), none)).toEqual({
            state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD,
        });
        expect(evaluateThreshold(low, reading(HAZARDOUS_THRESHOLD + 100), crossed(HAZARDOUS_THRESHOLD))).toBe(null);
    });

    it("the hazardous flag clears once the reading drops below 300 − buffer", () => {
        const low = device({ default_threshold: 50 });
        expect(evaluateThreshold(low, reading(HAZARDOUS_THRESHOLD), none)).toEqual({
            state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD,
        });
        // Still in the hysteresis band (285–299): the hazardous alert does not
        // re-fire, and the personal threshold of 50 is still exceeded so a
        // personal alert fires instead.
        expect(evaluateThreshold(low, reading(299), crossed(HAZARDOUS_THRESHOLD))).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
        // With the hazardous alert as the previous notification, a reading
        // below 300 − buffer (285) clears it.
        expect(evaluateThreshold(low, reading(284), crossed(HAZARDOUS_THRESHOLD))).toEqual({
            state: "cleared", threshold_value: HAZARDOUS_THRESHOLD,
        });
    });

    it("a personal alert is not cleared just because the number falls below 300", () => {
        const d = device({ default_threshold: 100 });
        // A personal alert fired at 150. Reading 200 is above 300 but the
        // previous alert was the personal one, so it must not clear.
        expect(evaluateThreshold(d, reading(200), crossed(100))).toBe(null);
        // Reading 90 — still above the personal clear line of 85 — must not clear.
        expect(evaluateThreshold(d, reading(90), crossed(100))).toBe(null);
    });

    it("the hazardous flag does not fire below 300 even with a low threshold", () => {
        const d = device({ default_threshold: 50 });
        expect(evaluateThreshold(d, reading(250), none)).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
        expect(evaluateThreshold(d, reading(299), none)).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
    });

    it("does nothing when the device has no threshold set", () => {
        const d = device({ default_threshold: null });
        expect(evaluateThreshold(d, reading(500), none)).toBe(null);
    });

    it("respects critical_alerts_enabled = false for the hazardous flag", () => {
        const d = device({ default_threshold: 50, critical_alerts_enabled: false });
        // Below 300 the personal threshold still fires.
        expect(evaluateThreshold(d, reading(100), none)).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
        // At/above 300 the personal threshold still fires — the hazardous
        // override is suppressed, but the user's own threshold is not.
        expect(evaluateThreshold(d, reading(HAZARDOUS_THRESHOLD + 100), none)).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
    });

    it("a hazardous alert replaces a personal alert without clearing first", () => {
        const d = device({ default_threshold: 50 });
        // Personal alert fired at 150.
        expect(evaluateThreshold(d, reading(150), none)).toEqual({
            state: "crossed_above", threshold_value: 50,
        });
        // Reading climbs to hazardous — fires the critical alert directly.
        expect(evaluateThreshold(d, reading(HAZARDOUS_THRESHOLD), crossed(50))).toEqual({
            state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD,
        });
    });
});

describe("constants", () => {
    it("exports the hazardous threshold and hysteresis buffer", () => {
        expect(HAZARDOUS_THRESHOLD).toBe(300);
        expect(HYSTERESIS_BUFFER).toBe(15);
    });
});