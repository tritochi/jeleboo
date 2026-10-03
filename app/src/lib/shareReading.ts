// Jeleboo — Web Share payload for the reading (Card 23). Pure so the exact
// shared wording is unit-tested; the platform gate lives at the call site
// (the control renders only where navigator.share exists).

import { classifyAqi } from "../theme/severity";
import { formatAge } from "../hooks/useStations";
import type { Reading } from "../hooks/useReading";

export const SHARE_URL = "https://jeleboo.vercel.app";

export interface SharePayload {
    title: string;
    text: string;
    url: string;
}

/** design.md Card 23 bullet: title / text / url, honest age included. */
export function buildSharePayload(reading: Reading): SharePayload {
    const severity = classifyAqi(reading.aqi_value);
    const aqi = Math.round(reading.aqi_value);
    return {
        title: `Jeleboo — AQI ${aqi}`,
        text: `AQI ${aqi} (${severity.label}) in ${reading.station_name} · updated ${formatAge(reading.recorded_at)} · via Jeleboo`,
        url: SHARE_URL,
    };
}

/** Platform gate — false hides the control entirely (never a dead button). */
export function canShareReading(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
