// Jeleboo — poll job. Runs on a schedule (later) and is manually triggerable
// now via POST /api/jobs/poll/run.
//
// For every device with a threshold:
//   1. Resolve a fresh reading for the device's last-known location.
//   2. Upsert it into `readings`.
//   3. Evaluate the reading against the device's threshold with hysteresis:
//      - A crossing ABOVE the threshold fires a notification.
//      - Don't re-fire until the reading drops back below
//        `threshold − buffer` (default buffer 15–20), so a value sitting
//        right at the line doesn't spam the device.
//   4. The hardcoded 300+ "hazardous" flag fires regardless of the personal
//      threshold when critical_alerts_enabled is true.
//   5. On each crossing, write a row to `notification_log` and hand the
//      subscription to the push dispatcher (Card 05).
//
// `runPoll` is written as a pure function over a DB-like interface so the
// hysteresis logic can be unit-tested without a real database or network.

import { getWaqiToken, resolveReadingForDevice, type ParsedReading } from "../sources/waqi";
import { upsertReading, logNotification, getLatestNotification, getAllDevices, type Device } from "../db/queries";
import { sendPush, crossingPayload } from "../push/send";

export const HAZARDOUS_THRESHOLD = 300;
export const HYSTERESIS_BUFFER = 15;

export interface PollDeps {
    devices: Device[];
    resolve: (lat: number, lng: number, token: string) => Promise<ParsedReading>;
    log: (msg: string) => void;
}

export interface PollResult {
    devicesChecked: number;
    notificationsSent: number;
    notificationsSuppressed: number;
    errors: string[];
}

export interface LastNotification {
    state: "crossed_above" | "cleared";
    threshold_value: number;
}

export interface EvaluateResult {
    state: "crossed_above" | "cleared";
    threshold_value: number;
}

/**
 * Evaluate whether a fresh reading should fire a notification for a device,
 * given the previous notification state. Pure and deterministic — this is the
 * function the hysteresis tests exercise.
 *
 * Returns the new state to log, or null if nothing should be logged.
 *
 * The last notification records WHICH threshold fired (its threshold_value),
 * so a hazardous alert and a personal alert are distinguishable even though
 * the state column only stores crossed_above/cleared. Each alert type has
 * its own fire line and its own clear line, and a new fire only replaces
 * the previous one when it comes from a *different* threshold.
 */
export function evaluateThreshold(
    device: Device,
    reading: ParsedReading,
    last: LastNotification | null
): EvaluateResult | null {
    const threshold = device.default_threshold;
    if (threshold === null || threshold === undefined) return null;

    const buffer = HYSTERESIS_BUFFER;
    const crossingLine = threshold + buffer;

    // Clear: only when the reading drops below the clear line of whichever
    // threshold last fired. A hazardous alert clears at 300 − buffer; a
    // personal alert clears at threshold − buffer. This runs BEFORE the
    // personal fire branch so a hazardous alert can clear even when the
    // reading is still above the personal crossing line.
    if (last?.state === "crossed_above") {
        const firedThreshold = last.threshold_value;
        const clearLine = firedThreshold === HAZARDOUS_THRESHOLD
            ? HAZARDOUS_THRESHOLD - buffer
            : firedThreshold - buffer;
        if (reading.aqi_value < clearLine) {
            return { state: "cleared", threshold_value: firedThreshold };
        }
    }

    // Hazardous fire: fires regardless of the personal threshold.
    if (device.critical_alerts_enabled && reading.aqi_value >= HAZARDOUS_THRESHOLD) {
        if (last?.state !== "crossed_above" || last?.threshold_value !== HAZARDOUS_THRESHOLD) {
            return { state: "crossed_above", threshold_value: HAZARDOUS_THRESHOLD };
        }
        return null;
    }

    // Personal fire.
    if (reading.aqi_value >= crossingLine) {
        if (last?.state !== "crossed_above" || last?.threshold_value !== threshold) {
            return { state: "crossed_above", threshold_value: threshold };
        }
        return null;
    }

    return null;
}

// ---- Quiet hours (Card 13) ----

/**
 * True when `nowUtcMinutes` (0–1439) falls inside the device's quiet window.
 * Handles windows that wrap midnight (e.g. 1320→420 = 22:00→07:00 UTC).
 * A disabled window (nulls) or a zero-length one (start === end) is never
 * "within" — that validation happens at the route, this is the read path.
 * Pure and deterministic — unit-tested in test/quiet-hours.test.ts.
 */
export function isWithinQuietHours(
    nowUtcMinutes: number,
    startUtc: number | null | undefined,
    endUtc: number | null | undefined
): boolean {
    if (
        startUtc === null || startUtc === undefined ||
        endUtc === null || endUtc === undefined ||
        startUtc === endUtc
    ) {
        return false;
    }
    if (startUtc < endUtc) {
        return nowUtcMinutes >= startUtc && nowUtcMinutes < endUtc;
    }
    // Wrap-around: the window spans midnight.
    return nowUtcMinutes >= startUtc || nowUtcMinutes < endUtc;
}

/**
 * Whether a would-be notification dispatch should be suppressed by quiet
 * hours. Hazardous (300+) dispatches bypass quiet hours unconditionally —
 * an air emergency must never be silenced by a bedtime setting. Pure and
 * unit-tested.
 */
export function shouldSuppressForQuietHours(
    readingAqi: number,
    startUtc: number | null | undefined,
    endUtc: number | null | undefined,
    nowUtcMinutes: number
): boolean {
    if (readingAqi >= HAZARDOUS_THRESHOLD) return false;
    return isWithinQuietHours(nowUtcMinutes, startUtc, endUtc);
}

/** Current minutes since midnight UTC — the one non-pure input. */
export function nowUtcMinutes(): number {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * Run one poll cycle against the real database and WAQI.
 */
export async function runPoll(deps: Partial<PollDeps> = {}): Promise<PollResult> {
    const resolve = deps.resolve ?? ((lat, lng, token) => resolveReadingForDevice(lat, lng, token));
    const log = deps.log ?? ((msg: string) => console.log(`[poll] ${msg}`));
    const devices = deps.devices ?? getAllDevices();

    const token = getWaqiToken();
    const result: PollResult = { devicesChecked: 0, notificationsSent: 0, notificationsSuppressed: 0, errors: [] };

    for (const device of devices) {
        result.devicesChecked++;

        if (device.default_threshold === null || device.default_threshold === undefined) {
            continue;
        }
        if (device.last_lat === null || device.last_lng === null) {
            result.errors.push(`Device ${device.id} has no recorded location; skipping.`);
            continue;
        }

        let reading: ParsedReading;
        try {
            reading = await resolve(device.last_lat, device.last_lng, token);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Device ${device.id}: ${msg}`);
            log(`upstream failure for device ${device.id}: ${msg}`);
            continue;
        }

        upsertReading(reading);

        const previous = getLatestNotification(device.id) as LastNotification | null;
        const newState = evaluateThreshold(device, reading, previous);

        if (newState) {
            // Quiet hours (Card 13): suppress the dispatch AND the log write
            // for non-hazardous notifications inside the device's window.
            // Skipping the log write is deliberate — hysteresis state stays
            // untouched, so a crossing still active when quiet hours end is
            // delivered by the next poll. Hazardous (300+) always dispatches.
            if (shouldSuppressForQuietHours(reading.aqi_value, device.quiet_start_utc, device.quiet_end_utc, nowUtcMinutes())) {
                result.notificationsSuppressed++;
                log(`device ${device.id}: ${newState.state} at AQI ${reading.aqi_value} suppressed (quiet hours)`);
                continue;
            }

            logNotification(
                device.id,
                newState.threshold_value,
                reading.aqi_value,
                newState.state
            );

            // Dispatch Web Push for the crossing. A failure here must not
            // crash the poll job — the notification_log row is already
            // written, so the crossing is recorded regardless.
            try {
                const payload = crossingPayload(
                    reading.aqi_value,
                    reading.station_name,
                    newState.state
                );
                const sendRes = await sendPush(device, payload);
                if (!sendRes.ok) {
                    result.errors.push(
                        `Device ${device.id}: push dispatch failed (${sendRes.reason}): ${sendRes.message}`
                    );
                }
            } catch (err) {
                result.errors.push(
                    `Device ${device.id}: push dispatch threw: ${err instanceof Error ? err.message : String(err)}`
                );
            }

            result.notificationsSent++;
        }
    }

    return result;
}

/**
 * Start an in-process poll scheduler (once on start, then every interval).
 * architecture.md allows either a host's own cron OR a lightweight interval
 * inside the process; this is the in-process option, enabled by setting
 * POLL_INTERVAL_MINUTES. Returns a stop handle for tests.
 */
export function startPollScheduler(intervalMinutes: number): { stop: () => void } {
    async function run() {
        try {
            const result = await runPoll();
            console.log(`[poll] cycle: ${JSON.stringify(result)}`);
        } catch (err) {
            console.error(
                `[poll] cycle failed: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }
    void run();
    const timer = setInterval(run, Math.max(1, intervalMinutes) * 60_000);
    return { stop: () => clearInterval(timer) };
}

/**
 * Trigger one poll cycle immediately, without waiting for the schedule.
 */
export async function triggerPoll(): Promise<PollResult> {
    return runPoll();
}