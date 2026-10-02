// Jeleboo — tests for the station-age formatter (stale-network readings
// must show their true age: builder decision 2026-09-30).

import { describe, it, expect } from "bun:test";
import { formatAge, minutesAgo } from "./useStations";

describe("formatAge", () => {
    const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

    it("tiers ages from minutes through months", () => {
        expect(formatAge(ago(0.4))).toBe("just now");
        expect(formatAge(ago(5))).toBe("5 min ago");
        expect(formatAge(ago(90))).toBe("1h ago");
        expect(formatAge(ago(60 * 24 * 30))).toBe("30d ago"); // 1,800 min = 30h!
        expect(formatAge(ago(60 * 24 * 400))).toBe("13 months ago"); // stale network
    });

    it("degrades unparseable timestamps safely", () => {
        expect(minutesAgo("not-a-date")).toBe(0);
        expect(formatAge("not-a-date")).toBe("just now");
    });
});
