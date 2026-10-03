// Jeleboo — tests for the app icon badge helper (Card 22): numeric badge,
// clear-on-unreadable, missing API, and throwing API (never breaks reading).

import { describe, it, expect } from "bun:test";
import { applyAppBadge, type BadgeApi } from "./appBadge";

describe("applyAppBadge", () => {
    it("sets the badge with a rounded integer for a finite aqi", async () => {
        const seen: number[] = [];
        const api: BadgeApi = { setAppBadge: (n) => { seen.push(n ?? -1); } };
        await applyAppBadge(api, 63.4);
        expect(seen).toEqual([63]);
    });

    it("clears the badge when the reading is unreadable (null)", async () => {
        let cleared = 0;
        let set: number[] = [];
        const api: BadgeApi = {
            setAppBadge: (n) => { set.push(n ?? -1); },
            clearAppBadge: () => { cleared += 1; },
        };
        await applyAppBadge(api, null);
        expect(cleared).toBe(1);
        expect(set).toEqual([]);
    });

    it("falls back to setAppBadge(0) when clearAppBadge is missing", async () => {
        const seen: number[] = [];
        const api: BadgeApi = { setAppBadge: (n) => { seen.push(n ?? -1); } };
        await applyAppBadge(api, null);
        expect(seen).toEqual([0]);
    });

    it("no-ops for a missing API and for NaN/negative aqi-clears safely", async () => {
        await applyAppBadge(null, 50); // absent api → no throw
        await applyAppBadge({}, 50); // no methods → no throw
        let cleared = 0;
        await applyAppBadge({ clearAppBadge: () => { cleared += 1; } }, NaN); // unreadable
        expect(cleared).toBe(1);
    });

    it("swallows a throwing API — the reading flow must never break", async () => {
        const api: BadgeApi = {
            setAppBadge: () => { throw new Error("quota"); },
            clearAppBadge: () => { throw new Error("unsupported"); },
        };
        await expect(applyAppBadge(api, 91)).resolves.toBeUndefined();
        await expect(applyAppBadge(api, null)).resolves.toBeUndefined();
    });
});
