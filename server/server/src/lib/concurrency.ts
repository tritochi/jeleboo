// Jeleboo — bounded-concurrency settle helper for the bounds collectors.
// WAQI's documented quota is generous (1,000 req/s per routes/stations.ts),
// but an unbounded fan-out (world grid × 4³ leaf cells ≈ thousands of
// simultaneous sockets) risks EMFILE and burst-throttling, and either failure
// mode shows up as partial data. The collectors therefore run their top-level
// cells through this helper: results come back in input order as
// PromiseSettledResult entries — same shape as Promise.allSettled, so callers
// count failures identically.

/** Top-level cells in flight for interactive viewport queries (peak leaf
 *  fan-out ≈ limit × 16 at the 7.5° leaf target). */
export const COLLECT_CONCURRENCY = 8;

/** Gentler batch for the background world crawl — ~1,500 calls per refresh
 *  against upstream needs pacing, not a burst (see bounds.ts TARGET notes). */
export const WORLD_COLLECT_CONCURRENCY = 4;

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
