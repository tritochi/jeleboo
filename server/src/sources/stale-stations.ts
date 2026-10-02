// Jeleboo — stale-station registry (builder decision 2026-09-30: "mix of 1
// and 2" — show stations WAQI catalogs with coordinates but no current AQI
// *everywhere* (search, map pins, overview dots), always carrying their true
// last-updated date so an old reading never passes as live).
//
// Why this exists: some WAQI networks (Philippines: 20 stations, Brunei: 4)
// are fully catalogued — /search lists them with coordinates — but every row
// reports `aqi: "-"`, so /map/bounds and /map/geo exclude them entirely. The
// only remaining truth source is /feed/<station-url>, which returns the
// last-known reading plus its real timestamp (verified: Manila Feb-2026,
// Brunei 2026-09-07).
//
// Discovery has no geographic query, so the registry sweeps /search with a
// static list of country names (stable ISO-3166 reference data — not the
// churny hand-maintained *station* lists the architecture forbids), then
// resolves each coordinate-bearing row: live rows become markers directly,
// aqi-"-" rows go through /feed/<slug> for the last-known value. Paced via
// fetchWaqiJson; in-memory cache with stale-last-good + coalesced refresh,
// same cadence as the world overview (WORLD_OVERVIEW_HOURS, default 6).

import { classifyAqi } from "../theme/severity";
import { fetchWaqiJson } from "./waqi";
import { settleWithLimit } from "../lib/concurrency";
import { normalizeSearchItem, type RawSearchItem } from "./stations";
import type { MapViewMarker } from "./map-view";
import type { ViewportBox } from "./bounds";

const WAQI_BASE = "https://api.waqi.info";

/**
 * Country-name keywords for the /search sweep. Deliberately comprehensive
 * (every country/territory, plus common English variants): a keyword with
 * no matches costs one cheap call, while a missed country is a missed
 * station. Fuzzy upstream matching absorbs most name variants.
 */
export const COUNTRY_KEYWORDS: readonly string[] = [
    "Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola",
    "Anguilla", "Antarctica", "Antigua", "Argentina", "Armenia", "Aruba",
    "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh",
    "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan",
    "Bolivia", "Bosnia", "Botswana", "Brazil", "Brunei", "Bulgaria",
    "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada",
    "Cayman Islands", "Central African Republic", "Chad", "Chile", "China",
    "Colombia", "Comoros", "Congo", "Costa Rica", "Ivory Coast", "Croatia",
    "Cuba", "Curaçao", "Cyprus", "Czech Republic", "Czechia", "Denmark",
    "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
    "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
    "Ethiopia", "Fiji", "Finland", "France", "French Guiana", "Gabon",
    "Gambia", "Georgia", "Germany", "Ghana", "Gibraltar", "Greece",
    "Greenland", "Grenada", "Guadeloupe", "Guatemala", "Guernsey", "Guinea",
    "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Isle of Man",
    "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan", "Kazakhstan",
    "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
    "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
    "Luxembourg", "Macau", "Madagascar", "Malawi", "Malaysia", "Maldives",
    "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania",
    "Mauritius", "Mayotte", "Mexico", "Micronesia", "Moldova", "Monaco",
    "Mongolia", "Montenegro", "Montserrat", "Morocco", "Mozambique",
    "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Caledonia",
    "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Puerto Rico", "Qatar", "Réunion", "Romania", "Russia",
    "Rwanda", "Saint Kitts", "Saint Lucia", "Saint Vincent", "Samoa",
    "San Marino", "Sao Tome", "Saudi Arabia", "Senegal", "Serbia",
    "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia",
    "Slovenia", "Solomon Islands", "Somalia", "South Africa", "Korea",
    "South Korea", "North Korea", "South Sudan", "Spain", "Sri Lanka",
    "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
    "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
    "Trinidad", "Tunisia", "Turkey", "Turkmenistan", "Turks and Caicos",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "Emirates",
    "United Kingdom", "UK", "United States", "USA", "Uruguay", "Uzbekistan",
    "Vanuatu", "Venezuela", "Vietnam", "Viet Nam", "Virgin Islands",
    "Wallis and Futuna", "Yemen", "Zambia", "Zimbabwe",
];

/** A coordinate-bearing /search row worth resolving. */
export interface StaleCandidate {
    uid: number;
    name: string;
    lat: number;
    lng: number;
    url: string; // station.url — the feed slug
    liveAqi: number | null; // numeric when the row already carries a reading
}

/**
 * Extract a resolvable candidate from a raw /search row: uid + name +
 * usable coordinates are mandatory; `url` is required only for feed
 * resolution of aqi-"-" rows (live rows never need it).
 */
export function candidateFromRow(row: RawSearchItem): StaleCandidate | null {
    if (!row || typeof row !== "object") return null;
    const uid = typeof row.uid === "number" ? row.uid : Number(row.uid);
    if (!Number.isFinite(uid)) return null;
    const name = typeof row.station?.name === "string" && row.station.name.length > 0
        ? row.station.name
        : null;
    if (!name) return null;
    const geo = Array.isArray(row.station?.geo) ? (row.station?.geo as unknown[]) : [];
    const lat = Number(geo[0]);
    const lng = Number(geo[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        return null;
    }
    const aqi = typeof row.aqi === "number" ? row.aqi : Number(row.aqi);
    const url = typeof row.station?.url === "string" ? row.station.url : "";
    return {
        uid,
        name,
        lat,
        lng,
        url,
        liveAqi: Number.isFinite(aqi) && aqi >= 0 ? aqi : null,
    };
}

/**
 * Build a marker from a parsed /feed response, falling back to the search
 * row's identity (verified equal: search uid == feed idx, search geo ==
 * feed city.geo). Returns null when the feed has no numeric AQI either —
 * a station with no value anywhere cannot be portrayed.
 */
export function markerFromFeed(
    candidate: StaleCandidate,
    data: unknown
): MapViewMarker | null {
    if (!data || typeof data !== "object") return null;
    const d = data as {
        aqi?: unknown;
        idx?: unknown;
        city?: { name?: unknown; geo?: unknown };
        time?: { iso?: unknown };
    };
    const aqi = typeof d.aqi === "number" ? d.aqi : Number(d.aqi);
    if (!Number.isFinite(aqi) || aqi < 0) return null; // "-" or missing → unportrayable

    let lat = candidate.lat;
    let lng = candidate.lng;
    if (lat === 0 && lng === 0) {
        const geo = Array.isArray(d.city?.geo) ? (d.city.geo as unknown[]) : [];
        lat = Number(geo[0]);
        lng = Number(geo[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    }
    const iso = typeof d.time?.iso === "string" ? d.time.iso : null;
    const lastUpdated = iso && !Number.isNaN(Date.parse(iso))
        ? iso
        : new Date().toISOString(); // last resort — feeds verified to carry iso
    const severity = classifyAqi(aqi);
    return {
        uid: candidate.uid,
        name: candidate.name,
        lat,
        lng,
        aqi,
        band: severity.band,
        bandLabel: severity.label,
        lastUpdated,
    };
}

/** One feed resolution for a stale candidate (paced + retried upstream). */
export async function fetchFeedMarker(
    candidate: StaleCandidate,
    token: string
): Promise<MapViewMarker | null> {
    if (!candidate.url) return null;
    const url = `${WAQI_BASE}/feed/${candidate.url}/?token=${encodeURIComponent(token)}`;
    const data = await fetchWaqiJson(url, "stale feed"); // throws → caller skips
    return markerFromFeed(candidate, data);
}

/**
 * Search-route enrichment: rows WAQI marked aqi:"-" (but with coordinates
 * and a feed slug) resolved through /feed, capped at `limit`, in WAQI's
 * original relevance order. Failures skip (search degrades to live-only).
 */
export async function enrichStaleSuggestions(
    rows: readonly RawSearchItem[],
    token: string,
    limit: number
): Promise<MapViewMarker[]> {
    if (limit <= 0) return [];
    const candidates: StaleCandidate[] = [];
    for (const row of rows) {
        const c = candidateFromRow(row);
        if (c && c.liveAqi === null && c.url) candidates.push(c);
        if (candidates.length >= limit) break;
    }
    const settled = await settleWithLimit(candidates, 4, (c) =>
        fetchFeedMarker(c, token).catch(() => null)
    );
    const markers = settled.flatMap((r) =>
        r.status === "fulfilled" && r.value ? [r.value] : []
    );
    return markers.slice(0, limit);
}

// ---- Registry cache (world-overview pattern) ----

function ttlMs(): number {
    const n = Number(process.env.WORLD_OVERVIEW_HOURS);
    return (Number.isFinite(n) && n > 0 ? n : 6) * 3_600_000;
}

let cache: MapViewMarker[] | null = null;
let cacheAt = 0;
let inflight: Promise<MapViewMarker[]> | null = null;

async function refreshRegistry(token: string): Promise<MapViewMarker[]> {
    const searchUrl = (kw: string) =>
        `${WAQI_BASE}/search/?token=${encodeURIComponent(token)}&keyword=${encodeURIComponent(kw)}`;
    // Sweep countries in small batches — each keyword is one paced call.
    const rowResults = await settleWithLimit(COUNTRY_KEYWORDS, 4, async (kw) => {
        const data = await fetchWaqiJson(searchUrl(kw), "stale sweep").catch(() => null);
        return Array.isArray(data) ? (data as RawSearchItem[]) : [];
    });
    const rows = rowResults.flatMap((r) =>
        r.status === "fulfilled" ? r.value : []
    );

    // Dedupe candidates by uid across fuzzy-matching keywords.
    const byUid = new Map<number, StaleCandidate>();
    for (const row of rows) {
        const c = candidateFromRow(row);
        if (c && !byUid.has(c.uid)) byUid.set(c.uid, c);
    }

    // Live rows become markers directly (normalize re-checks everything);
    // aqi-"-" rows go through their feed slug for the last-known reading.
    const out = new Map<number, MapViewMarker>();
    const stale: StaleCandidate[] = [];
    for (const c of byUid.values()) {
        if (c.liveAqi !== null) {
            const m = normalizeSearchItem(
                { uid: c.uid, aqi: c.liveAqi, station: { name: c.name, geo: [c.lat, c.lng] } },
                { requireMy: false }
            );
            if (m) out.set(m.uid, m);
        } else {
            stale.push(c);
        }
    }
    const resolved = await settleWithLimit(stale, 6, (c) =>
        fetchFeedMarker(c, token).catch(() => null)
    );
    for (const r of resolved) {
        if (r.status === "fulfilled" && r.value) out.set(r.value.uid, r.value);
    }
    const markers = [...out.values()];
    console.log(
        `[stale-stations] registry: ${markers.length} markers ` +
        `(${stale.length} feed-resolved of ${byUid.size} coordinate-bearing rows, ` +
        `${COUNTRY_KEYWORDS.length} keywords)`
    );
    return markers;
}

function startRefresh(token: string): Promise<MapViewMarker[]> {
    if (!inflight) {
        inflight = refreshRegistry(token)
            .then((markers) => {
                cache = markers;
                cacheAt = Date.now();
                return markers;
            })
            .catch((err) => {
                console.error("[stale-stations] refresh failed:",
                    err instanceof Error ? err.message : err);
                return cache ?? [];
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
}

/**
 * Blocking read for the world-overview refresh: fresh cache → serve;
 * stale → serve stale-last-good while a background refresh runs; cold →
 * coalesced blocking refresh. NEVER throws — an empty registry only means
 * the dark-network stations are missing until the next attempt.
 */
export async function getStaleStations(token: string): Promise<MapViewMarker[]> {
    if (cache && Date.now() - cacheAt < ttlMs()) return cache;
    if (cache) {
        void startRefresh(token); // stale-last-good: never block the reader
        return cache;
    }
    return startRefresh(token);
}

/**
 * Non-blocking read for map-view viewport merges: returns whatever is
 * cached (possibly empty) and kicks a background refresh on a cold start,
 * so an interactive pan never waits on the country sweep.
 */
export function peekStaleStations(): MapViewMarker[] {
    if (cache && Date.now() - cacheAt < ttlMs()) return cache;
    if (!inflight) {
        void startRefresh(process.env.WAQI_TOKEN ?? "");
    }
    return cache ?? [];
}

/** Registry markers whose coordinates fall inside a viewport box. */
export function markersInBox(
    markers: readonly MapViewMarker[],
    box: ViewportBox
): MapViewMarker[] {
    return markers.filter(
        (m) =>
            m.lat >= box.lat1 && m.lat <= box.lat2 &&
            m.lng >= box.lng1 && m.lng <= box.lng2
    );
}

/** Warm the cache on the overview cadence (same env, no new config). */
export function startStaleStationScheduler(hours: number): { stop: () => void } {
    const token = process.env.WAQI_TOKEN ?? "";
    async function run() {
        await getStaleStations(token); // coalesced; never throws
    }
    void run();
    const timer = setInterval(run, Math.max(1, hours) * 3_600_000);
    return { stop: () => clearInterval(timer) };
}

/** Test hook — clear the module-level cache. */
export function resetStaleStationsForTests(): void {
    cache = null;
    cacheAt = 0;
    inflight = null;
}


