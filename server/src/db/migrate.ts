// Jeleboo — schema migration. `CREATE TABLE IF NOT EXISTS` never alters an
// existing table, so columns added after the initial schema must be added
// explicitly. This runs once at startup and is idempotent.

import type { Database } from "bun:sqlite";

interface ColumnInfo {
    name: string;
}

function tableColumns(db: Database, table: string): ColumnInfo[] {
    return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
    const cols = tableColumns(db, table);
    if (cols.some((c) => c.name === column)) return;
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function migrate(db: Database): void {
    // Added in Work Card 04: a device's last-known location, which the poll
    // job needs to resolve a reading per device.
    addColumnIfMissing(db, "devices", "last_lat", "REAL");
    addColumnIfMissing(db, "devices", "last_lng", "REAL");
}