// Jeleboo — tests for the bounded-concurrency settle helper used by the
// bounds collectors (world grid × leaf fan-out must not burst sockets).

import { describe, it, expect } from "bun:test";
import { settleWithLimit } from "../src/lib/concurrency";

describe("settleWithLimit", () => {
    it("records settled results in input order and never rejects", async () => {
        const res = await settleWithLimit([3, 1, 2], 2, async (n) => {
            await new Promise((r) => setTimeout(r, n * 5));
            if (n === 1) throw new Error("boom");
            return n * 10;
        });
        expect(res.map((r) => r.status)).toEqual([
            "fulfilled",
            "rejected",
            "fulfilled",
        ]);
        expect(res[0]).toEqual({ status: "fulfilled", value: 30 });
        expect(res[2]).toEqual({ status: "fulfilled", value: 20 });
        expect((res[1] as PromiseRejectedResult).reason).toBeInstanceOf(Error);
    });

    it("keeps at most `limit` operations in flight", async () => {
        let active = 0;
        let peak = 0;
        await settleWithLimit(
            Array.from({ length: 20 }, (_, i) => i),
            3,
            async () => {
                active += 1;
                peak = Math.max(peak, active);
                await new Promise((r) => setTimeout(r, 2));
                active -= 1;
            }
        );
        expect(peak).toBeLessThanOrEqual(3);
    });

    it("handles empty input", async () => {
        const res = await settleWithLimit([], 4, async () => 1);
        expect(res).toEqual([]);
    });

    it("runs sequentially when limit is 1", async () => {
        const order: number[] = [];
        await settleWithLimit([1, 2, 3], 1, async (n) => {
            order.push(n);
            await new Promise((r) => setTimeout(r, 1));
            return n;
        });
        expect(order).toEqual([1, 2, 3]);
    });
});
