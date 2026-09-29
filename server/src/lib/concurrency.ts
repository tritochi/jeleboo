// Jeleboo — bounded-concurrency settle helper for the bounds collectors.
// WAQI's documented quota is generous (1,000 req/s per routes/stations.ts),
// but an unbounded fan-out (world grid × 4³ leaf cells ≈ thousands of
// simultaneous sockets) risks EMFILE and burst-throttling, and either failure
// mode shows up as partial data. The collectors therefore run their top-level
// cells through this helper: results come back in input order as
// PromiseSettledResult entries — same shape as Promise.allSettled, so callers
// count failures identically.

/** Top-level cells in flight per collection (peak leaf fan-out ≈ limit × 64). */
export const COLLECT_CONCURRENCY = 8;

/**
 * Map `fn` over `items` with at most `limit` promises in flight. Never
 * rejects: each result is fulfilled with the value or rejected with the
 * reason, in input order (array indices are assigned synchronously, so
 * workers can complete in any order without scrambling positions).
 */
export async function settleWithLimit<T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    let next = 0;
    const workers = Array.from(
        { length: Math.max(1, Math.min(limit, items.length)) },
        async () => {
            for (;;) {
                const i = next++;
                if (i >= items.length) return;
                try {
                    results[i] = { status: "fulfilled", value: await fn(items[i], i) };
                } catch (reason) {
                    results[i] = { status: "rejected", reason };
                }
            }
        }
    );
    await Promise.all(workers);
    return results;
}
