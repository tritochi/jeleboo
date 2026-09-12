// Jeleboo — severity bands. One source of truth for colour + label.
// Per design.md: colour is ALWAYS paired with a text label — colour alone
// never carries meaning. No clinical/telehealth language: this is a status
// reading, not a medical app.

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
    cssVar: string; // matches app/src/styles.css :root variables (band TEXT colour)
}

// Official US EPA / WAQI scale, per design.md § Color / Contrast Rules.
// Hazardous is 300+ so the displayed band always agrees with which alert
// fires: isHazardous and the poll job's HAZARDOUS_THRESHOLD both use >= 300.
export function classifyAqi(aqi: number): Severity {
    if (!Number.isFinite(aqi)) {
        return { band: "good", label: "No reading", cssVar: "--text-muted" };
    }
    if (aqi <= 50) {
        return { band: "good", label: "Good", cssVar: "--sev-good-text" };
    }
    if (aqi <= 100) {
        return { band: "moderate", label: "Moderate", cssVar: "--sev-moderate-text" };
    }
    if (aqi <= 150) {
        return { band: "usg", label: "Unhealthy for Sensitive Groups", cssVar: "--sev-usg-text" };
    }
    if (aqi <= 200) {
        return { band: "unhealthy", label: "Unhealthy", cssVar: "--sev-unhealthy-text" };
    }
    if (aqi <= 299) {
        return { band: "very-unhealthy", label: "Very Unhealthy", cssVar: "--sev-very-unhealthy-text" };
    }
    return { band: "hazardous", label: "Hazardous", cssVar: "--sev-hazardous-text" };
}

export function isHazardous(aqi: number): boolean {
    return Number.isFinite(aqi) && aqi >= 300;
}