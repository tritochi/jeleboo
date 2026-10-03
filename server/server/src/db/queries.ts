// Jeleboo — SQLite queries. All write paths are parameterised.

import { db } from "./index";
import type { ParsedReading } from "../sources/waqi";

export function upsertReading(r: ParsedReading): number {
    const stmt = db.prepare(`
        INSERT INTO readings (source, station_name, lat, lng, aqi_value, scale, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(station_name, source, recorded_at) DO UPDATE SET
            aqi_value = excluded.aqi_value
        RETURNING id
    `);
    const row = stmt.get(
        r.source,
        r.station_name,
        r.lat,
        r.lng,
        r.aqi_value,
        r.scale,
        r.recorded_at
    ) as { id: number } | null;
    return row?.id ?? 0;
}

export function latestReading(stationName?: string) {
    if (stationName) {
        return db.prepare(`
            SELECT * FROM readings
            WHERE station_name = ?
            ORDER BY recorded_at DESC LIMIT 1
        `).get(stationName);
    }
    return db.prepare(`
        SELECT * FROM readings ORDER BY recorded_at DESC LIMIT 1
    `).get();
}

export function readingsSince(iso: string) {
    return db.prepare(`
        SELECT * FROM readings WHERE recorded_at >= ? ORDER BY recorded_at DESC
    `).all(iso);
}

// ---- Devices ----

export interface Device {
    id: string;
    push_subscription: string;
    default_threshold: number | null;
    critical_alerts_enabled: number;
    last_lat: number | null;
    last_lng: number | null;
    quiet_start_utc: number | null;
    quiet_end_utc: number | null;
    last_station_name: string | null;
    created_at: string;
}

export function upsertDevice(id: string, pushSubscription: object): void {
    db.prepare(`
        INSERT INTO devices (id, push_subscription)
        VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET push_subscription = excluded.push_subscription
    `).run(id, JSON.stringify(pushSubscription));
}

export function updateDeviceLocation(id: string, lat: number, lng: number): void {
    db.prepare(`
        UPDATE devices SET last_lat = ?, last_lng = ? WHERE id = ?
    `).run(lat, lng, id);
}

export function setDeviceThreshold(id: string, threshold: number): void {
    db.prepare(`
        UPDATE devices SET default_threshold = ? WHERE id = ?
    `).run(threshold, id);
}

export function setCriticalAlerts(id: string, enabled: boolean): void {
    db.prepare(`
        UPDATE devices SET critical_alerts_enabled = ? WHERE id = ?
    `).run(enabled ? 1 : 0, id);
}

export function setDeviceQuietHours(
    id: string,
    startUtc: number | null,
    endUtc: number | null
): void {
    db.prepare(`
        UPDATE devices SET quiet_start_utc = ?, quiet_end_utc = ? WHERE id = ?
    `).run(startUtc, endUtc, id);
}

export function setDeviceStation(id: string, stationName: string): void {
    db.prepare(`
        UPDATE devices SET last_station_name = ? WHERE id = ?
    `).run(stationName, id);
}

export function getDevice(id: string): Device | null {
    return db.prepare(`SELECT * FROM devices WHERE id = ?`).get(id) as Device | null;
}

export function getAllDevices(): Device[] {
    return db.prepare(`SELECT * FROM devices`).all() as Device[];
}

// ---- Notification log ----

export function logNotification(
    deviceId: string,
    thresholdValue: number,
    readingValue: number,
    state: "crossed_above" | "cleared"
): number {
    const stmt = db.prepare(`
        INSERT INTO notification_log (device_id, threshold_value, reading_value, state)
        VALUES (?, ?, ?, ?)
        RETURNING id
    `);
    const row = stmt.get(deviceId, thresholdValue, readingValue, state) as { id: number } | null;
    return row?.id ?? 0;
}

export function getLatestNotification(deviceId: string): { state: string; threshold_value: number } | null {
    return db.prepare(`
        SELECT state, threshold_value FROM notification_log
        WHERE device_id = ?
        ORDER BY sent_at DESC LIMIT 1
    `).get(deviceId) as { state: string; threshold_value: number } | null;
}

export function getNotificationsSince(deviceId: string, iso: string) {
    return db.prepare(`
        SELECT * FROM notification_log
        WHERE device_id = ? AND sent_at >= ?
        ORDER BY sent_at DESC
    `).all(deviceId, iso);
}