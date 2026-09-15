// Jeleboo — shared per-IP sliding-window rate limiter.
// Extracted from routes/reading.ts in Card 11 so every public route reuses
// the same mechanism (architecture.md Security Notes: public routes get basic
// rate limiting). Quota is not the constraint — this is abuse protection.

export function makeRateLimiter(limit: number, windowMs: number) {
    const hits = new Map<string, number[]>();
    return function allow(ip: string): boolean {
        const now = Date.now();
        const windowStart = now - windowMs;
        const times = (hits.get(ip) ?? []).filter((t) => t > windowStart);
        times.push(now);
        hits.set(ip, times);
        return times.length <= limit;
    };
}
