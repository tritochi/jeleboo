// Jeleboo — first screen. The reading is the clear focus: check-and-go,
// not a browse app. Calm, low-density, generous whitespace. No clinical tone.

import { lazy, Suspense, useEffect, useState } from "react";
import { useReading } from "./hooks/useReading";
import { ReadingCard, LoadingCard, ErrorCard } from "./components/ReadingCard";
import { ThresholdSetter, getDeviceId } from "./components/ThresholdSetter";
import { NotificationPrompt } from "./components/NotificationPrompt";
import { InstallPrompt } from "./components/InstallPrompt";
import "./styles.css";

// Card 12: the map is a second screen and is lazy-loaded — Leaflet never
// lands in the home screen's first paint (design.md Map Screen).
const MapScreen = lazy(() => import("./components/MapScreen"));

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";
const DEVICE_ID = getDeviceId();

function storedNotificationsEnabled(): boolean {
    try {
        const raw = localStorage.getItem("jeleboo:notifications-enabled");
        return raw === null ? true : raw === "1";
    } catch {
        return true;
    }
}

function App() {
    const [retry, setRetry] = useState(0);
    const { status, reading, error } = useReading(retry);
    const [offline, setOffline] = useState(!navigator.onLine);
    const [threshold, setThreshold] = useState<number | null>(null);
    // Map & Station Explorer is a second screen (design.md) — swapping views
    // keeps the home screen's single-reading focus untouched.
    const [view, setView] = useState<"home" | "map">("home");

    // Notifications on/off — design.md keeps an easy toggle in the threshold
    // section, and the choice persists so the prompt never nags anyone who
    // has deliberately switched it off.
    const [notificationsEnabled, setNotificationsEnabled] = useState(storedNotificationsEnabled);

    function handleNotificationsToggle(next: boolean) {
        setNotificationsEnabled(next);
        try {
            localStorage.setItem("jeleboo:notifications-enabled", next ? "1" : "0");
        } catch {
            // storage unavailable — this session only
        }
    }

    useEffect(() => {
        const onOffline = () => setOffline(true);
        const onOnline = () => setOffline(false);
        window.addEventListener("offline", onOffline);
        window.addEventListener("online", onOnline);
        return () => {
            window.removeEventListener("offline", onOffline);
            window.removeEventListener("online", onOnline);
        };
    }, []);

    // Register the device and load its saved threshold on mount.
    useEffect(() => {
        let cancelled = false;

        async function loadDevice() {
            try {
                // Register the device identity. The push subscription is wired
                // by NotificationPrompt; a placeholder here keeps the device
                // row alive so the threshold can be saved and the poll job
                // can target it.
                await fetch(`${BACKEND}/api/devices`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: DEVICE_ID,
                        push_subscription: { placeholder: true },
                        lat: reading?.lat,
                        lng: reading?.lng,
                    }),
                });

                const res = await fetch(`${BACKEND}/api/devices/${encodeURIComponent(DEVICE_ID)}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.default_threshold !== null && data.default_threshold !== undefined) {
                    setThreshold(data.default_threshold);
                }
            } catch {
                // Non-fatal: the threshold control still works; it just has no
                // saved value to pre-fill.
            }
        }

        loadDevice();
        // Re-load when the reading changes so the device's location is current.
    }, [retry, reading?.lat, reading?.lng]);

    function handleRetry() {
        setRetry((k) => k + 1);
    }

    function handleSaved(next: number) {
        setThreshold(next);
    }

    return (
        <div className="app">
            <header className="app-header">
                <h1>Jeleboo</h1>
                <p className="app-subtitle">Malaysia air quality</p>
            </header>

            <main className="app-main" aria-live="polite">
                {view === "map" ? (
                    <Suspense fallback={<LoadingCard />}>
                        <MapScreen onBack={() => setView("home")} />
                    </Suspense>
                ) : (
                <>
                {offline ? (
                    <p className="offline-banner" role="alert">
                        You are offline. Showing the last known reading.
                    </p>
                ) : null}

                {status === "loading" && !reading ? (
                    <LoadingCard />
                ) : status === "ready" && reading ? (
                    <ReadingCard reading={reading} />
                ) : (
                    <ErrorCard
                        message={error ?? "Could not load a reading."}
                        lastReading={reading}
                        onRetry={handleRetry}
                    />
                )}

                {/* Notification prompt: secondary to the reading, shown once
                    installation allows it. On iOS before standalone this
                    defers to the Add-to-Home-Screen instructions. */}
                <NotificationPrompt deviceId={DEVICE_ID} enabled={notificationsEnabled} />

                {/* Install prompt: platform-aware, secondary, dismissible. */}
                <InstallPrompt />

                {/* Threshold control: secondary, revealed on demand. */}
                <details className="threshold-toggle">
                    <summary className="threshold-summary">
                        {threshold !== null
                            ? `Alert me above ${threshold} AQI`
                            : "Set an alert threshold"}
                    </summary>
                    <ThresholdSetter
                        deviceId={DEVICE_ID}
                        initialThreshold={threshold}
                        onSaved={handleSaved}
                    />

                    <label className="notifications-toggle">
                        <input
                            type="checkbox"
                            checked={notificationsEnabled}
                            onChange={(e) => handleNotificationsToggle(e.target.checked)}
                        />
                        <span>Push notifications on</span>
                    </label>
                </details>

                {/* Map & Station Explorer: quiet secondary control, same calm
                    bordered style as the threshold summary (design.md). */}
                <button
                    type="button"
                    className="map-open"
                    onClick={() => setView("map")}
                >
                    Map of Malaysian stations
                </button>
                </>
                )}
            </main>
        </div>
    );
}

export default App;