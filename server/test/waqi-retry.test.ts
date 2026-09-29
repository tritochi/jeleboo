// Jeleboo — tests for the bounded-retry upstream fetch. The bounds
// collectors fire hundreds of calls per refresh; one transient blip would
// otherwise become a silent hole in the station set.

import { describe, it, expect, afterEach, beforeAll } from "bun:test";
import { fetchWaqiJson, setWaqiRetryDelayForTests } from "../src/sources/waqi";

const realFetch = globalThis.fetch;

beforeAll(() => {
    setWaqiRetryDelayForTests(5); // backoff measured in ms, not seconds, here
});

afterEach(() => {
    globalThis.fetch = realFetch;
});

/** Install a fetch stub (bun-types' fetch carries extra props — via unknown). */
function stubFetch(fn: () => Promise<Response>): void {
    globalThis.fetch = fn as unknown as typeof fetch;
}

function fakeResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

describe("fetchWaqiJson (bounded retry)", () => {
    it("returns data on the first successful attempt", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return fakeResponse(200, { status: "ok", data: [1, 2] });
        });
        const data = await fetchWaqiJson("https://example.test/bounds", "test");
        expect(data).toEqual([1, 2]);
        expect(calls).toBe(1);
    });

    it("retries once after a transient 500 and then succeeds", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return calls === 1
                ? fakeResponse(500)
                : fakeResponse(200, { status: "ok", data: "fine" });
        });
        expect(await fetchWaqiJson("https://example.test/bounds", "test")).toBe("fine");
        expect(calls).toBe(2);
    });

    it("retries a transient non-ok payload (status: error)", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return calls === 1
                ? fakeResponse(200, { status: "error", data: "busy" })
                : fakeResponse(200, { status: "ok", data: 7 });
        });
        expect(await fetchWaqiJson("https://example.test/bounds", "test")).toBe(7);
        expect(calls).toBe(2);
    });

    it("does not retry a deterministic 4xx — one call, then throws", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return fakeResponse(404);
        });
        await expect(
            fetchWaqiJson("https://example.test/bounds", "test")
        ).rejects.toThrow("WAQI HTTP 404");
        expect(calls).toBe(1);
    });

    it("throws the original error after the single retry also fails", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            return fakeResponse(429);
        });
        await expect(
            fetchWaqiJson("https://example.test/bounds", "test")
        ).rejects.toThrow("WAQI HTTP 429");
        expect(calls).toBe(2);
    });

    it("retries a network failure and preserves the historical strings", async () => {
        let calls = 0;
        stubFetch(async () => {
            calls += 1;
            if (calls === 1) throw new Error("socket hangup");
            return fakeResponse(200, { status: "ok", data: "ok-after-blip" });
        });
        expect(await fetchWaqiJson("https://example.test/bounds", "test")).toBe(
            "ok-after-blip"
        );
        expect(calls).toBe(2);
    });
});
