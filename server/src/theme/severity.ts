// Jeleboo — server-side six-band US EPA/WAQI severity classifier.
// Mirrors app/src/theme/severity.ts exactly (design.md's confirmed bands) —
// the server never ships color data, only the band key + label; the frontend
// maps bands to its own CSS variables. Kept in sync by tests on both sides.

export type SeverityBand =
    | "good"
    | "moderate"
    | "usg"
    | "unhealthy"
    | "very-unhealthy"
    | "hazardous";

export interface Severity {
    band: SeverityBand;
    label: string;
}

// Hazardous starts at 300 to match the hardcoded critical flag exactly
// (jobs/poll.ts uses >= 300) — see design.md and build-status.md.
export function classifyAqi(aqi: number): Severity {
    if (!Number.isFinite(aqi) || aqi < 0) {
        return { band: "good", label: "Unknown" };
    }
    if (aqi <= 50) return { band: "good", label: "Good" };
    if (aqi <= 100) return { band: "moderate", label: "Moderate" };
    if (aqi <= 150) return { band: "usg", label: "Unhealthy for Sensitive Groups" };
    if (aqi <= 200) return { band: "unhealthy", label: "Unhealthy" };
    if (aqi <= 299) return { band: "very-unhealthy", label: "Very Unhealthy" };
    return { band: "hazardous", label: "Hazardous" };
}
