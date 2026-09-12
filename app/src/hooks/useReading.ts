// Jeleboo — fetch the current reading for the user's location.
// The frontend NEVER calls WAQI/IQAir directly — keys and rate limits stay
// server-side. This hook only talks to the local backend.

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";

export interface Reading {
    aqi_value: number;
    station_name: string;
    source: string;
    scale: string;
    recorded_at: string;
    last_updated_minutes_ago: number;
    lat: number;
    lng: number;
    via: "coordinate" | "city";
}

export interface ReadingState {
    status: "loading" | "ready" | "error";
    reading: Reading | null;
    error: string | null;
}

const CACHE_KEY = "jeleboo:last-reading";

function readCache(): Reading | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Reading;
    } catch {
        return null;
    }
}

function writeCache(r: Reading) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(r));
    } catch {
        // storage unavailable — in-memory only
    }
}

/**
 * `trigger` is a retry counter. Increment it (from App) to re-run the fetch.
 */
export function useReading(trigger = 0) {
    const [state, setState] = useState<ReadingState>({
        status: "loading",
        reading: readCache(),
        error: null,
    });

    useEffect(() => {
        let cancelled = false;

        async function fetchReading() {
            // Prefer fresh geolocation; on denial, fall back to the last
            // cached reading rather than breaking the screen.
            let lat: number | null = null;
            let lng: number | null = null;

            const geo = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
                if (!("geolocation" in navigator)) {
                    resolve(null);
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { timeout: 8000, maximumAge: 60_000 }
                );
            });

            if (geo) {
                lat = geo.lat;
                lng = geo.lng;
            }

            if (lat === null || lng === null) {
                if (cancelled) return;
                setState((prev) => ({
                    status: prev.reading ? "ready" : "error",
                    reading: prev.reading,
                    error: prev.reading ? null : "Location unavailable. Showing last known reading.",
                }));
                return;
            }

            try {
                const url = `${BACKEND}/api/reading?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = (await res.json()) as Reading;

                if (cancelled) return;
                writeCache(data);
                setState({ status: "ready", reading: data, error: null });
            } catch {
                if (cancelled) return;
                // Network/upstream failure: fall back to the last known reading
                // and its age, never a blank or broken screen.
                setState((prev) => ({
                    status: prev.reading ? "ready" : "error",
                    reading: prev.reading,
                    error: prev.reading
                        ? "Could not refresh. Showing last known reading."
                        : "Could not reach the air-quality source. Please try again shortly.",
                }));
            }
        }

        fetchReading();
        return () => {
            cancelled = true;
        };
    }, [trigger]);

    return state;
}