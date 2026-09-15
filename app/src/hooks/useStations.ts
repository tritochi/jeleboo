// Jeleboo — fetch the cached Malaysian station set for the map screen.
// Talks only to the Jeleboo backend (never WAQI directly). Mirrors
// useReading's pattern: cache-last-good in localStorage, stale and error
// states instead of a broken screen (design.md Map Screen states).

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";

export interface StationMarker {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    aqi: number;
    band: "good" | "moderate" | "usg" | "unhealthy" | "very-unhealthy" | "hazardous";
    bandLabel: string;
    lastUpdated: string; // ISO 8601
}

export interface StationSetResponse {
    stations: StationMarker[];
    fetchedAt: string;
    stale: boolean;
    failedStates: string[];
}

export interface StationsState {
    status: "loading" | "ready" | "error";
    set: StationSetResponse | null;
    error: string | null;
}

const CACHE_KEY = "jeleboo:station-set";

function readCache(): StationSetResponse | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StationSetResponse;
        if (!parsed || !Array.isArray(parsed.stations)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(set: StationSetResponse) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(set));
    } catch {
        // storage unavailable — in-memory only
    }
}

/** Minutes since the server built the set (for the stale banner). */
export function minutesAgo(iso: string): number {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return 0;
    return Math.max(0, Math.round((Date.now() - then) / 60000));
}

export function useStations(trigger = 0) {
    const [state, setState] = useState<StationsState>(() => {
        const cached = readCache();
        return cached
            ? { status: "ready", set: cached, error: null }
            : { status: "loading", set: null, error: null };
    });

    useEffect(() => {
        let cancelled = false;

        async function fetchStations() {
            try {
                const res = await fetch(`${BACKEND}/api/stations`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as StationSetResponse;
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
                        error: "Could not load the station map.",
                    });
                }
            }
        }

        fetchStations();
        return () => {
            cancelled = true;
        };
    }, [trigger]);

    return state;
}

export interface SearchResult {
    name: string;
    aqi: number;
    lat: number;
    lng: number;
    uid: number;
}

/** Debounced Malaysian place suggestions from the backend (Card 11 route). */
export function usePlaceSearch(query: string): { results: SearchResult[]; searching: boolean } {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`${BACKEND}/api/search?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as { results: SearchResult[] };
                setResults(data.results ?? []);
            } catch {
                // aborted or failed — keep the previous list, dropdown just
                // doesn't update; the map never breaks over search.
            } finally {
                setSearching(false);
            }
        }, 300); // design.md: debounced ~300 ms

        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [query]);

    return { results, searching };
}
