// Jeleboo — quiet hours setter (Card 13). An enable toggle plus two time
// fields inside the threshold section, per design.md's quiet-hours bullet.
// Times are entered in the user's local time and converted to minutes since
// midnight UTC before saving — the server never guesses timezones. Mirrors
// ThresholdSetter's fetch/error/saved pattern.

import { useEffect, useState } from "react";

const BACKEND = (import.meta.env.VITE_BACKEND_URL as string) ?? "";

interface QuietHoursSetterProps {
    deviceId: string;
    /** Stored UTC minutes; null = disabled. */
    initialStartUtc?: number | null;
    initialEndUtc?: number | null;
}

/** Local "HH:MM" → minutes since midnight UTC, using the current offset. */
function localTimeToUtcMinutes(hhmm: string): number | null {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
    if (!m) return null;
    const localMinutes = Number(m[1]) * 60 + Number(m[2]);
    return ((localMinutes + new Date().getTimezoneOffset()) % 1440 + 1440) % 1440;
}

/** Stored UTC minutes → local "HH:MM" for the time inputs. */
function utcMinutesToLocalTime(utcMinutes: number): string {
    const localMinutes = ((utcMinutes - new Date().getTimezoneOffset()) % 1440 + 1440) % 1440;
    const hh = String(Math.floor(localMinutes / 60)).padStart(2, "0");
    const mm = String(localMinutes % 60).padStart(2, "0");
    return `${hh}:${mm}`;
}

export function QuietHoursSetter({ deviceId, initialStartUtc, initialEndUtc }: QuietHoursSetterProps) {
    const enabledInitially = initialStartUtc !== null && initialStartUtc !== undefined
        && initialEndUtc !== null && initialEndUtc !== undefined;
    const [enabled, setEnabled] = useState(enabledInitially);
    const [start, setStart] = useState(
        enabledInitially ? utcMinutesToLocalTime(initialStartUtc as number) : "22:00"
    );
    const [end, setEnd] = useState(
        enabledInitially ? utcMinutesToLocalTime(initialEndUtc as number) : "07:00"
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    // Reflect external changes (e.g. after the device row reloads).
    useEffect(() => {
        const on = initialStartUtc !== null && initialStartUtc !== undefined
            && initialEndUtc !== null && initialEndUtc !== undefined;
        setEnabled(on);
        if (on) {
            setStart(utcMinutesToLocalTime(initialStartUtc as number));
            setEnd(utcMinutesToLocalTime(initialEndUtc as number));
        }
    }, [initialStartUtc, initialEndUtc]);

    async function save() {
        let body: Record<string, unknown>;
        if (!enabled) {
            // Disabling clears the stored window.
            body = { enabled: false };
        } else {
            const startUtc = localTimeToUtcMinutes(start);
            const endUtc = localTimeToUtcMinutes(end);
            if (startUtc === null || endUtc === null) {
                setError("Enter both times as HH:MM.");
                return;
            }
            if (startUtc === endUtc) {
                setError("Quiet hours must span a range of time.");
                return;
            }
            body = { enabled: true, startUtcMinutes: startUtc, endUtcMinutes: endUtc };
        }

        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            const res = await fetch(
                `${BACKEND}/api/devices/${encodeURIComponent(deviceId)}/quiet-hours`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                }
            );
            if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                throw new Error((b as any)?.error ?? `HTTP ${res.status}`);
            }
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save quiet hours.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="quiet-hours" aria-label="Quiet hours">
            <label className="quiet-hours-toggle">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                        setEnabled(e.target.checked);
                        setError(null);
                        setSaved(false);
                    }}
                />
                <span>Quiet hours</span>
            </label>
            {enabled ? (
                <div className="quiet-hours-row">
                    <label className="quiet-hours-field">
                        <span>from</span>
                        <input
                            type="time"
                            value={start}
                            onChange={(e) => {
                                setStart(e.target.value);
                                setError(null);
                                setSaved(false);
                            }}
                            disabled={saving}
                        />
                    </label>
                    <label className="quiet-hours-field">
                        <span>to</span>
                        <input
                            type="time"
                            value={end}
                            onChange={(e) => {
                                setEnd(e.target.value);
                                setError(null);
                                setSaved(false);
                            }}
                            disabled={saving}
                        />
                    </label>
                </div>
            ) : null}
            {error ? <p className="threshold-error" role="alert">{error}</p> : null}
            {saved ? <p className="threshold-saved" role="status">Saved.</p> : null}
            {enabled ? (
                <p className="quiet-hours-note">
                    Haz alerts (300+) still come through during quiet hours.
                </p>
            ) : null}
            <button type="button" className="threshold-save" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
            </button>
        </section>
    );
}
