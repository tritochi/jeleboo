// Jeleboo — threshold setter. A single number input with a save button,
// secondary to the reading, revealed on demand. Calm, low-density, no clinical
// tone. Per design.md's progressive-disclosure and anti-slop rules.

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";
const MIN_THRESHOLD = 0;
const MAX_THRESHOLD = 500;

interface ThresholdSetterProps {
    deviceId: string;
    initialThreshold?: number | null;
    onSaved?: (threshold: number) => void;
}

export function ThresholdSetter({ deviceId, initialThreshold, onSaved }: ThresholdSetterProps) {
    const [value, setValue] = useState<string>(
        initialThreshold !== null && initialThreshold !== undefined ? String(initialThreshold) : ""
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Reflect external changes (e.g. after a poll refreshes the device row).
    useEffect(() => {
        if (initialThreshold !== null && initialThreshold !== undefined) {
            setValue(String(initialThreshold));
        }
    }, [initialThreshold]);

    async function save() {
        const trimmed = value.trim();
        if (trimmed === "") {
            setError("Enter a number between 0 and 500.");
            return;
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n) || n < MIN_THRESHOLD || n > MAX_THRESHOLD) {
            setError(`Must be a number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}.`);
            return;
        }

        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await fetch(
                `${BACKEND}/api/devices/${encodeURIComponent(deviceId)}/threshold`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ threshold: n }),
                }
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error((body as any)?.error ?? `HTTP ${res.status}`);
            }
            setValue(String(n));
            setSaved(true);
            onSaved?.(n);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save threshold.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="threshold-setter" aria-label="Set your alert threshold">
            <label className="threshold-label" htmlFor="threshold-input">
                Alert me when the reading crosses
            </label>
            <form className="threshold-row" onSubmit={(e) => { e.preventDefault(); save(); }}>
                <input
                    id="threshold-input"
                    className="threshold-input"
                    type="number"
                    min={MIN_THRESHOLD}
                    max={MAX_THRESHOLD}
                    step={1}
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError(null);
                        setSaved(false);
                    }}
                    disabled={saving}
                />
                <span className="threshold-unit">AQI</span>
                <button
                    type="submit"
                    className="threshold-save"
                    disabled={saving}
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            </form>
            {error ? <p className="threshold-error" role="alert">{error}</p> : null}
            {saved ? <p className="threshold-saved" role="status">Saved.</p> : null}
        </section>
    );
}

export function getDeviceId(): string {
    const KEY = "jeleboo:device-id";
    try {
        const existing = localStorage.getItem(KEY);
        if (existing) return existing;
        const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `dev-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(KEY, id);
        return id;
    } catch {
        return "dev-fallback";
    }
}