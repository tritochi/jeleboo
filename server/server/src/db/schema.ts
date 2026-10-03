// Jeleboo — SQLite schema. Opened once via bun:sqlite in db/index.ts.

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS devices (
    id                    TEXT PRIMARY KEY,
    push_subscription    TEXT NOT NULL,
    default_threshold     REAL,
    critical_alerts_enabled INTEGER NOT NULL DEFAULT 1,
    last_lat              REAL,
    last_lng              REAL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS readings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    source        TEXT    NOT NULL,
    station_name  TEXT    NOT NULL,
    lat           REAL    NOT NULL,
    lng           REAL    NOT NULL,
    aqi_value     REAL    NOT NULL,
    scale         TEXT    NOT NULL,
    recorded_at   TEXT    NOT NULL,
    UNIQUE (station_name, source, recorded_at)
);

CREATE TABLE IF NOT EXISTS notification_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id       TEXT    NOT NULL REFERENCES devices(id),
    threshold_value REAL    NOT NULL,
    reading_value   REAL    NOT NULL,
    state           TEXT    NOT NULL CHECK (state IN ('crossed_above', 'cleared')),
    sent_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_readings_recorded ON readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_station ON readings(station_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_device ON notification_log(device_id, sent_at DESC);
`;