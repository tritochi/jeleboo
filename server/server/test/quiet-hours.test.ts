// Jeleboo — tests for quiet hours (Card 13): the window logic, the
// suppression decision (including the hazardous 300+ bypass), and the
// route's validation. All pure functions — no DB, no network, no clock.

import { describe, it, expect } from "bun:test";
import {
    isWithinQuietHours,
    shouldSuppressForQuietHours,
    HAZARDOUS_THRESHOLD,
} from "../src/jobs/poll";
import { parseQuietHours } from "../src/routes/quiet-hours";

describe("isWithinQuietHours", () => {
    it("is false when the window is disabled (nulls)", () => {
        expect(isWithinQuietHours(600, null, null)).toBe(false);
        expect(isWithinQuietHours(600, 1320, null)).toBe(false);
        expect(isWithinQuietHours(600, null, 420)).toBe(false);
        expect(isWithinQuietHours(600, undefined, undefined)).toBe(false);
    });

    it("is false for a zero-length window (start === end)", () => {
        expect(isWithinQuietHours(600, 600, 600)).toBe(false);
    });

    it("handles a same-day window (06:00→08:00 UTC)", () => {
        const start = 6 * 60; // 360
        const end = 8 * 60; // 480
        expect(isWithinQuietHours(360, start, end)).toBe(true); // 06:00 — start inclusive
        expect(isWithinQuietHours(430, start, end)).toBe(true);
        expect(isWithinQuietHours(479, start, end)).toBe(true);
        expect(isWithinQuietHours(480, start, end)).toBe(false); // end exclusive
        expect(isWithinQuietHours(359, start, end)).toBe(false);
    });

    it("handles a wrap-around window (22:00→07:00 UTC)", () => {
        const start = 22 * 60; // 1320
        const end = 7 * 60; // 420
        expect(isWithinQuietHours(1320, start, end)).toBe(true); // 22:00
        expect(isWithinQuietHours(23 * 60 + 59, start, end)).toBe(true); // 23:59
        expect(isWithinQuietHours(0, start, end)).toBe(true); // midnight
        expect(isWithinQuietHours(419, start, end)).toBe(true); // 06:59
        expect(isWithinQuietHours(420, start, end)).toBe(false); // 07:00 — end exclusive
        expect(isWithinQuietHours(719, start, end)).toBe(false); // 11:59
        expect(isWithinQuietHours(1319, start, end)).toBe(false); // 21:59
    });
});

describe("shouldSuppressForQuietHours", () => {
    const start = 22 * 60; // 22:00 UTC
    const end = 7 * 60; // 07:00 UTC
    const night = 23 * 60; // 23:00 UTC — inside the window
    const day = 12 * 60; // 12:00 UTC — outside

    it("suppresses a personal crossing inside the window", () => {
        expect(shouldSuppressForQuietHours(120, start, end, night)).toBe(true);
    });

    it("does not suppress outside the window", () => {
        expect(shouldSuppressForQuietHours(120, start, end, day)).toBe(false);
    });

    it("does not suppress when quiet hours are disabled", () => {
        expect(shouldSuppressForQuietHours(120, null, null, night)).toBe(false);
    });

    it("NEVER suppresses a hazardous reading (300+ bypass)", () => {
        expect(shouldSuppressForQuietHours(HAZARDOUS_THRESHOLD, start, end, night)).toBe(false);
        expect(shouldSuppressForQuietHours(450, start, end, night)).toBe(false);
        expect(shouldSuppressForQuietHours(HAZARDOUS_THRESHOLD - 1, start, end, night)).toBe(true);
    });
});

describe("parseQuietHours (route validation)", () => {
    it("accepts an enabled window with distinct valid minutes", () => {
        const r = parseQuietHours({ enabled: true, startUtcMinutes: 1320, endUtcMinutes: 420 });
        expect(r).toEqual({ enabled: true, startUtc: 1320, endUtc: 420 });
    });

    it("accepts disabling with no window (clears stored values)", () => {
        expect(parseQuietHours({ enabled: false })).toEqual({
            enabled: false,
            startUtc: null,
            endUtc: null,
        });
    });

    it("rejects malformed bodies", () => {
        expect(parseQuietHours(null)).toBeNull();
        expect(parseQuietHours("nope")).toBeNull();
        expect(parseQuietHours({})).toBeNull();
        expect(parseQuietHours({ enabled: "yes", startUtcMinutes: 1, endUtcMinutes: 2 })).toBeNull();
    });

    it("rejects out-of-range or non-integer minutes when enabled", () => {
        expect(parseQuietHours({ enabled: true, startUtcMinutes: -1, endUtcMinutes: 420 })).toBeNull();
        expect(parseQuietHours({ enabled: true, startUtcMinutes: 1320, endUtcMinutes: 1440 })).toBeNull();
        expect(parseQuietHours({ enabled: true, startUtcMinutes: 1320.5, endUtcMinutes: 420 })).toBeNull();
        expect(parseQuietHours({ enabled: true, startUtcMinutes: "1320", endUtcMinutes: 420 })).toBeNull();
    });

    it("rejects a zero-length window when enabled (that is mute, not quiet hours)", () => {
        expect(parseQuietHours({ enabled: true, startUtcMinutes: 600, endUtcMinutes: 600 })).toBeNull();
    });
});
