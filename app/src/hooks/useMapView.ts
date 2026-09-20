// Jeleboo — viewport-driven station queries for the worldwide explore mode
// (Card 17, confirmed architecture). The map queries /api/map-view on
// pan/zoom settle at zoom >= 4 only; below that, no query fires (the world
// overview layer takes over there in Cards 18–19). Talks only to the Jeleboo
// backend — the WAQI token never reaches the browser.

import { useCallback, useRef, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";

/** The confirmed zoom gate: live viewport queries fire at zoom >= 4 only. */
export function queryZoomGate(zoom: number | null | undefined): boolean {
    return typeof zoom === "number" && Number.isFinite(zoom) && zoom >= 4;
}

export interface MapViewViewport {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
}

/** Leaflet corner coordinates → order-A viewport. Pure and testable. */
export function viewportFromCorners(
    swLat: number,
    swLng: number,
    neLat: number,
    neLng: number
): MapViewViewport {
    return { lat1: swLat, lng1: swLng, lat2: neLat, lng2: neLng };
}

export interface MapViewMarker {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    aqi: number;
    band: "good" | "moderate" | "usg" | "unhealthy" | "very-unhealthy" | "hazardous";
    bandLabel: string;
    lastUpdated: string; // ISO 8601
}

export interface MapViewResponse {
    stations: MapViewMarker[];
    fetchedAt: string;
    stale: boolean;
}

export interface MapViewState {
    status: "idle" | "loading" | "ready" | "error";
    set: MapViewResponse | null;
    error: string | null;
}

export function useMapView() {
    const [state, setState] = useState<MapViewState>({ status: "idle", set: null, error: null });
    const lastViewport = useRef<MapViewViewport | null>(null);
    const queryId = useRef(0);

    const query = useCallback(async (v: MapViewViewport) => {
        lastViewport.current = v;
        const id = ++queryId.current;
        setState((prev) => ({ status: "loading", set: prev.set, error: null }));
        try {
            const url = `${BACKEND}/api/map-view?lat1=${encodeURIComponent(v.lat1)}&lng1=${encodeURIComponent(v.lng1)}&lat2=${encodeURIComponent(v.lat2)}&lng2=${encodeURIComponent(v.lng2)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as MapViewResponse;
            if (id !== queryId.current) return; // a newer settle superseded this
            setState({ status: "ready", set: data, error: null });
        } catch {
            if (id !== queryId.current) return;
            setState((prev) => ({
                status: prev.set ? "ready" : "error",
                set: prev.set,
                error: prev.set
                    ? "Could not refresh this area. Showing the last known pins."
                    : "Can't load the station map.",
            }));
        }
    }, []);

    /** Re-query the last viewport (the Retry button). */
    const retry = useCallback(() => {
        if (lastViewport.current) void query(lastViewport.current);
    }, [query]);

    return { state, queryViewport: query, retry };
}
