// Jeleboo — Map Screen (Station Explorer), Cards 12 + 17 + 19.
// Second screen per design.md: worldwide AQI pins via live viewport queries
// (zoom >= 4, confirmed "Worldwide explore mode"), a low-fidelity world
// overview dot layer below zoom 4 (Card 19), and viewing-only search.
// Lazy-loaded from App.tsx — the home screen's first paint never pays for
// Leaflet. Colors come strictly from the existing six-band CSS variables
// (band fill + dark text stroke) — no new colors anywhere in this file.

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
    usePlaceSearch,
    minutesAgo,
    type StationMarker,
    type SearchResult,
} from "../hooks/useStations";
import {
    useMapView,
    queryZoomGate,
    viewportFromCorners,
    type MapViewViewport,
} from "../hooks/useMapView";
import { useWorldOverview, type OverviewMarker } from "../hooks/useWorldOverview";
import { classifyAqi } from "../theme/severity";

/** Zoom gate for the overview layer: shown below zoom 4, hidden at/above 4. */
export function overviewZoomGate(zoom: number | null | undefined): boolean {
    return typeof zoom === "number" && Number.isFinite(zoom) && zoom < 4;
}

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

/** Reports every pan/zoom settle; the parent debounces + gates on zoom. */
function ViewportQuery({ onSettle }: { onSettle: (v: MapViewViewport, zoom: number) => void }) {
    const map = useMapEvents({
        moveend: () => settle(),
        zoomend: () => settle(),
    });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function settle() {
        const b = map.getBounds();
        const v = viewportFromCorners(
            b.getSouthWest().lat,
            b.getSouthWest().lng,
            b.getNorthEast().lat,
            b.getNorthEast().lng
        );
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => onSettle(v, map.getZoom()), 500); // architecture.md: settle debounce
    }

    useEffect(() => {
        settle(); // first query right after the initial fitBounds
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

/** Grey placeholder dots while the world overview loads (design.md state). */
function SkeletonWorldOverview() {
    // A sparse, deterministic sprinkle across continents for a loading cue.
    const spots: Array<[number, number]> = [
        [39.0, -95.7], // USA center
        [51.1, 10.6], // Central Europe
        [20.6, 78.9], // India center
        [-33.9, 18.4], // South Africa
        [35.7, 139.8], // Japan
        [14.6, -90.5], // Guatemala (bridges North+South America dots)
        [1.3, 103.8], // Singapore area (Asia connectivity)
    ];
    return (
        <>
            {spots.map(([lat, lng], i) => (
                <CircleMarker
                    key={`wo-sk-${i}`}
                    center={[lat, lng]}
                    radius={5}
                    interactive={false}
                    pathOptions={{ color: "transparent", fillColor: "#D8D5CE", fillOpacity: 0.5, weight: 0 }}
                />
            ))}
        </>
    );
}

/** ~10px band-fill dots, no stroke — visually "less precise" than live pins (design.md map screen). */
function OverviewDot({ marker, onSelect }: { marker: OverviewMarker; onSelect: (m: OverviewMarker) => void }) {
    const fill = cssColor(`--sev-${marker.band}-fill`, "#ECEAE4");
    const handlers = useMemo(() => ({ click: () => onSelect(marker) }), [marker, onSelect]);
    return (
        <>
            <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={5}
                pathOptions={{
                    className: "map-overview-dot",
                    color: "transparent",
                    fillColor: fill,
                    fillOpacity: 0.85,
                    weight: 0,
                }}
            />
            {/* Invisible 44px hit target so the dot is thumb-safe (design.md). */}
            <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={22}
                pathOptions={{ opacity: 0, fillOpacity: 0 }}
                eventHandlers={handlers}
            />
        </>
    );
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
    const { state, queryViewport, retry } = useMapView();
    const { status, set, error } = state;
    const [query, setQuery] = useState("");
    const { results } = usePlaceSearch(query);
    const [selected, setSelected] = useState<Selected | null>(null);
    const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
    const [offline, setOffline] = useState(!navigator.onLine);
    // Card 19 crossover: overview dots below zoom 4, live viewport pins at
    // zoom >= 4. Starts false — the map opens fitted to Malaysia (zoom ~5),
    // so the first layer is the live one.
    const [showOverview, setShowOverview] = useState(false);
    // Bumps useWorldOverview's trigger from the overview Retry button.
    const [overviewRetry, setOverviewRetry] = useState(0);
    // Card 19: world overview layer for zoom < 4 (fetched once per trigger;
    // cached-last-good + stale handling live inside the hook).
    const overview = useWorldOverview(overviewRetry);

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

    function selectOverview(m: OverviewMarker) {
        setSelected({
            name: m.name,
            lat: m.lat,
            lng: m.lng,
            aqi: m.aqi,
            uid: m.uid,
        });
    }

    const listEmpty = status === "ready" && set !== null && set.stations.length === 0;

    /** Card 19: recompute layer visibility on every pan/zoom settle. */
    function handleSettle(v: MapViewViewport, z: number) {
        setShowOverview(overviewZoomGate(z));
        if (queryZoomGate(z)) {
            void queryViewport(v);
        }
        // Below zoom 4: no query fires (Cards 18–19 add the overview layer).
    }

    const pins = useMemo(() => {
        if (!set) return [];
        return set.stations.map((m) => (
            <StationPin key={m.uid} marker={m} onSelect={selectStation} />
        ));
    }, [set]);

    /** Card 19: overview dots from the global layer, shown below zoom 4. */
    const overviewPins = useMemo(() => {
        if (!overview.set) return [];
        return overview.set.stations.map((m) => (
            <OverviewDot key={m.uid} marker={m} onSelect={selectOverview} />
        ));
    }, [overview.set]);

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

            {showOverview && overview.set?.stale ? (
                <p className="map-stale" role="status">
                    Stale — world overview last updated{" "}
                    {minutesAgo(overview.set.fetchedAt)} min ago
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
                    <ViewportQuery onSettle={handleSettle} />
                    {flyTarget ? <FlyToSelection lat={flyTarget.lat} lng={flyTarget.lng} /> : null}
                    {/* Card 19 crossover: overview dots below zoom 4, live
                        viewport pins at zoom >= 4. Never both at once. */}
                    {showOverview
                        ? overview.status === "loading"
                            ? <SkeletonWorldOverview />
                            : overviewPins
                        : status === "idle" || status === "loading"
                            ? <SkeletonPins />
                            : pins}
                </MapContainer>

                {(showOverview
                    ? overview.status === "loading"
                    : status === "idle" || status === "loading") ? (
                    <div className="map-overlay" role="status">
                        <p>Loading stations…</p>
                    </div>
                ) : null}

                {(showOverview ? overview.status === "error" : status === "error") ? (
                    <div className="map-overlay" role="alert">
                        <div className="map-error-card">
                            <p>
                                {(showOverview ? overview.error : error) ??
                                    "Can't load the station map."}
                            </p>
                            <button
                                type="button"
                                className="map-retry"
                                onClick={() =>
                                    showOverview
                                        ? setOverviewRetry((n) => n + 1)
                                        : retry()
                                }
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                ) : null}

                {(showOverview
                    ? overview.status === "ready" &&
                      overview.set !== null &&
                      overview.set.stations.length === 0
                    : listEmpty) ? (
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
                    {selected.uid !== null && (set || overview.set) ? (
                        (() => {
                            const uid = selected.uid;
                            const m =
                                set?.stations.find((s) => s.uid === uid) ??
                                overview.set?.stations.find((s) => s.uid === uid);
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
