// Jeleboo — tests for the settings-portability URL (Card 24): parse, range,
// and strip-after-consume.

import { describe, it, expect } from "bun:test";
import { readThresholdParam, consumeThresholdParam } from "./thresholdUrl";

describe("readThresholdParam", () => {
    it("reads a valid integer from ?threshold= or &threshold=", () => {
        expect(readThresholdParam("?threshold=150")).toBe(150);
        expect(readThresholdParam("?a=1&threshold=250")).toBe(250);
        expect(readThresholdParam("?threshold=0")).toBe(0); // min is valid
        expect(readThresholdParam("?threshold=500")).toBe(500); // max is valid
    });

    it("ignores absent, non-numeric, fractional, and out-of-range values", () => {
        expect(readThresholdParam("")).toBeNull();
        expect(readThresholdParam("?other=1")).toBeNull();
        expect(readThresholdParam("?threshold=abc")).toBeNull();
        expect(readThresholdParam("?threshold=150.5")).toBeNull();
        expect(readThresholdParam("?threshold=501")).toBeNull();
        expect(readThresholdParam("?threshold=9999")).toBeNull();
    });
});

describe("consumeThresholdParam", () => {
    it("removes threshold but keeps other params and the hash", () => {
        expect(consumeThresholdParam("https://jeleboo.vercel.app/?threshold=150")).toBe(
            "https://jeleboo.vercel.app/"
        );
        expect(consumeThresholdParam("https://x.test/?a=1&threshold=250#h")).toBe(
            "https://x.test/?a=1#h"
        );
    });

    it("never throws on unparseable input", () => {
        expect(consumeThresholdParam("not a url")).toBe("not a url");
    });
});
