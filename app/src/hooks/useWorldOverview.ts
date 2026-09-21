// Jeleboo — fetch the cached global station overview for the zoomed-out map.
// (Card 19). Fetches /api/world-overview on mount (and on retry); mirrors
// useStations' cached-last-good + stale-banner pattern. Talks only to the
// Jeleboo backend — the WAQI token never reaches the browser.

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";

export interface OverviewMarker {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    band: "good" | "moderate" | "usg" | "unhealthy" | "very-unhealthy" | "hazardous";
    bandLabel: string;
    aqi: number;
    lastUpdated: string; // ISO 8601
}

export interface WorldOverviewResponse {
    stations: OverviewMarker[];
    fetchedAt: string;
    stale: boolean;
}

export interface WorldOverviewState {
    status: "loading" | "ready" | "error";
    set: WorldOverviewResponse | null;
    error: string | null;
}

const CACHE_KEY = "jeleboo:world-overview";

function readCache(): WorldOverviewResponse | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as WorldOverviewResponse;
        if (!parsed || !Array.isArray(parsed.stations)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(set: WorldOverviewResponse) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(set));
    } catch {
        // storage unavailable — in-memory only
    }
}

export function useWorldOverview(trigger = 0) {
    const [state, setState] = useState<WorldOverviewState>(() => {
        const cached = readCache();
        return cached
            ? { status: "ready", set: cached, error: null }
            : { status: "loading", set: null, error: null };
    });

    useEffect(() => {
        let cancelled = false;

        async function fetchOverview() {
            try {
                const res = await fetch(`${BACKEND}/api/world-overview`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as WorldOverviewResponse;
                if (cancelled) return;
                writeCache(data);
                setState({ status: "ready", set: data, error: null });
            } catch {
                if (cancelled) return;
                const cached = readCache();
                if (cached) {
                    // Cached-last-good stays visible, flagged stale (design.md).
                    setState({
                        status: "ready",
                        set: { ...cached, stale: true },
                        error: null,
                    });
                } else {
                    setState({
                        status: "error",
                        set: null,
                        error: "Can't load the global station overview.",
                    });
                }
            }
        }

        fetchOverview();
        return () => {
            cancelled = true;
        };
    }, [trigger]);

    return state;
}
