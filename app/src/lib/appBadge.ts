// Jeleboo — app icon badge (Card 22, Badging API). The helper is pure and
// injectable so the reading flow never depends on platform quirks: unsupported
// platforms no-op, and a throwing API (private mode, quota) is swallowed —
// a badge must never break the screen that shows the reading itself.

/** Structural shape of the Badging API methods we use (they live on Navigator). */
export interface BadgeApi {
    setAppBadge?: (contents?: number) => Promise<void> | void;
    clearAppBadge?: () => Promise<void> | void;
}

/**
 * Reflect the current reading on the app icon: a finite `aqi` sets the badge
 * (rounded — badges show integers), `null`/unreadable clears it. Never throws.
 */
export async function applyAppBadge(
    api: BadgeApi | null | undefined,
    aqi: number | null
): Promise<void> {
    try {
        if (!api) return;
        if (aqi !== null && Number.isFinite(aqi) && aqi >= 0) {
            if (typeof api.setAppBadge === "function") {
                await api.setAppBadge(Math.round(aqi));
            }
            return;
        }
        // Unreadable/offline: clear so an old number never outlives its truth.
        if (typeof api.clearAppBadge === "function") {
            await api.clearAppBadge();
        } else if (typeof api.setAppBadge === "function") {
            await api.setAppBadge(0);
        }
    } catch {
        // Platform quirks (private mode, unsupported badge size) — ignore.
    }
}

/** Navigator cast for call sites — every missing method is a no-op inside. */
export function navigatorBadge(): BadgeApi | null {
    return typeof navigator !== "undefined"
        ? (navigator as unknown as BadgeApi)
        : null;
}
