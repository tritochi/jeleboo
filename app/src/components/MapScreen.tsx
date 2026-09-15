// Jeleboo — Map Screen (Station Explorer), Card 12.
// Second screen per design.md: live Malaysian AQI pins + viewing-only search.
// Lazy-loaded from App.tsx — the home screen's first paint never pays for
// Leaflet. Colors come strictly from the existing six-band CSS variables
// (band fill + dark text stroke) — no new colors anywhere in this file.

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
    useStations,
    usePlaceSearch,
    minutesAgo,
    type StationMarker,
    type SearchResult,
} from "../hooks/useStations";
import { classifyAqi } from "../theme/severity";

const MALAYSIA_BOUNDS: [[number, number], [number, number]] = [
    [0.8, 99.5], // SW corner (covers Langkawi/Malacca Strait edge)
    [7.5, 119.5], // NE corner (covers Sabah's east coast)
];

/** Resolve a severity CSS variable to its concrete color at render time. */
function cssColor(varName: string, fallback: string): string {
    if (typeof window === "undefined") return fallback;
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
}

function bandFill(band: StationMarker["band"]): string {
    return cssColor(`--sev-${band}-fill`, "#ECEAE4");
}

function bandStroke(band: StationMarker["band"]): string {
    return cssColor(`--sev-${band}-text`, "#1F2937");
}

/** Fit the whole of Malaysia (both halves) once, on load. */
function FitMalaysia() {
    const map = useMap();
    useEffect(() => {
        map.fitBounds(MALAYSIA_BOUNDS, { padding: [8, 8] });
    }, [map]);
    return null;
}

/** Pan/zoom to the selected place, viewing-only (design.md search rule). */
function FlyToSelection({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo([lat, lng], Math.max(map.getZoom(), 10), { duration: 0.8 });
    }, [map, lat, lng]);
    return null;
}

/** Grey placeholder circles while the station set loads (design.md state). */
function SkeletonPins() {
    const spots: Array<[number, number]> = [
        [3.14, 101.69], [5.41, 100.34], [1.56, 110.39], [5.98, 116.07],
        [4.6, 101.11], [2.05, 102.6], [6.13, 102.24], [1.49, 103.74],
    ];
    return (
        <>
            {spots.map(([lat, lng], i) => (
                <CircleMarker
                    key={`sk-${i}`}
                    center={[lat, lng]}
                    radius={11}
                    interactive={false}
                    pathOptions={{ color: "#D8D5CE", fillColor: "#ECEAE4", fillOpacity: 1, weight: 2 }}
                />
            ))}
        </>
    );
}

interface Selected {
    name: string;
    lat: number;
    lng: number;
    aqi: number | null;
    uid: number | null;
}

export default function MapScreen({ onBack }: { onBack: () => void }) {
    const [attempt, setAttempt] = useState(0);
    const { status, set, error } = useStations(attempt);
    const [query, setQuery] = useState("");
    const { results } = usePlaceSearch(query);
    const [selected, setSelected] = useState<Selected | null>(null);
    const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const off = () => setOffline(true);
        const on = () => setOffline(false);
        window.addEventListener("offline", off);
        window.addEventListener("online", on);
        return () => {
            window.removeEventListener("offline", off);
            window.removeEventListener("online", on);
        };
    }, []);

    function selectResult(r: SearchResult) {
        // Viewing-only per design.md: pan + info card. Never writes threshold,
        // recorded location, or notification settings.
        setSelected({ name: r.name, lat: r.lat, lng: r.lng, aqi: r.aqi, uid: r.uid });
        setFlyTarget({ lat: r.lat, lng: r.lng });
        setQuery("");
    }

    function selectStation(m: StationMarker) {
        setSelected({ name: m.name, lat: m.lat, lng: m.lng, aqi: m.aqi, uid: m.uid });
    }

    const listEmpty = status === "ready" && set !== null && set.stations.length === 0;

    const pins = useMemo(() => {
        if (!set) return [];
        return set.stations.map((m) => (
            <StationPin key={m.uid} marker={m} onSelect={selectStation} />
        ));
    }, [set]);

    return (
        <section className="map-screen" aria-label="Station map">
            <button type="button" className="map-back" onClick={onBack}>
                Back to reading
            </button>

            <div className="map-search">
                <input
                    type="search"
                    className="map-search-input"
                    placeholder="Search a place in Malaysia"
                    aria-label="Search a place in Malaysia"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim().length >= 2 && results.length > 0 ? (
                    <ul className="map-suggestions" role="listbox" aria-label="Place suggestions">
                        {results.map((r) => (
                            <li key={r.uid}>
                                <button
                                    type="button"
                                    className="map-suggestion"
                                    onClick={() => selectResult(r)}
                                >
                                    <span className="map-suggestion-name">{r.name}</span>
                                    <span className="map-suggestion-aqi">
                                        AQI {r.aqi} · {classifyAqi(r.aqi).label}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            {offline ? (
                <p className="offline-banner" role="alert">
                    You are offline. Showing cached stations.
                </p>
            ) : null}

            {set?.stale ? (
                <p className="map-stale" role="status">
                    Stale — stations last updated {minutesAgo(set.fetchedAt)} min ago
                </p>
            ) : null}

            <div className="map-area">
                <MapContainer
                    center={[3.9, 108]}
                    zoom={6}
                    scrollWheelZoom
                    className="map-canvas"
                    attributionControl={false}
                >
                    <TileLayer
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />
                    <FitMalaysia />
                    {flyTarget ? <FlyToSelection lat={flyTarget.lat} lng={flyTarget.lng} /> : null}
                    {status === "loading" ? <SkeletonPins /> : pins}
                </MapContainer>

                {status === "loading" ? (
                    <div className="map-overlay" role="status">
                        <p>Loading stations…</p>
                    </div>
                ) : null}

                {status === "error" ? (
                    <div className="map-overlay" role="alert">
                        <div className="map-error-card">
                            <p>{error ?? "Can't load the station map."}</p>
                            <button
                                type="button"
                                className="map-retry"
                                onClick={() => setAttempt((k) => k + 1)}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                ) : null}

                {listEmpty ? (
                    <div className="map-overlay" role="status">
                        <p className="map-empty">No stations found here</p>
                    </div>
                ) : null}
            </div>

            {selected ? (
                <div className="map-card" role="status">
                    <p className="map-card-name">{selected.name}</p>
                    {selected.aqi !== null ? (
                        (() => {
                            const sev = classifyAqi(selected.aqi as number);
                            return (
                                <p className="map-card-reading">
                                    <span
                                        className="map-card-aqi"
                                        style={{ color: cssColor(`--sev-${sev.band}-text`, "#1F2937") }}
                                    >
                                        {selected.aqi}
                                    </span>
                                    <span className="map-card-label">{sev.label}</span>
                                </p>
                            );
                        })()
                    ) : (
                        <p className="map-card-label">No current reading</p>
                    )}
                    <p className="map-card-meta">Source: WAQI</p>
                    {selected.uid !== null && set ? (
                        (() => {
                            const m = set.stations.find((s) => s.uid === selected.uid);
                            return m ? (
                                <p className="map-card-meta">
                                    Last updated {minutesAgo(m.lastUpdated)} min ago
                                </p>
                            ) : null;
                        })()
                    ) : null}
                </div>
            ) : null}

            <p className="map-attribution">
                © OpenStreetMap contributors · AQI data: WAQI
            </p>
        </section>
    );
}

function StationPin({ marker: m, onSelect }: { marker: StationMarker; onSelect: (m: StationMarker) => void }) {
    const fill = bandFill(m.band);
    const stroke = bandStroke(m.band);
    const handlers = useMemo(() => ({ click: () => onSelect(m) }), [m, onSelect]);
    return (
        <>
            {/* Visual circle: ~22px diameter, band fill + dark band-text stroke. */}
            <CircleMarker
                center={[m.lat, m.lng]}
                radius={11}
                pathOptions={{ color: stroke, fillColor: fill, fillOpacity: 0.95, weight: 2 }}
            />
            {/* Invisible 44px hit target so the pin is thumb-safe (design.md). */}
            <CircleMarker
                center={[m.lat, m.lng]}
                radius={22}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
                eventHandlers={handlers}
            />
        </>
    );
}
