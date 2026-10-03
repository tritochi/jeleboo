// Jeleboo — shared bun:sqlite connection. Opened once; all routes and the poll
// job import from here so there is exactly one connection for the whole process.

import { Database } from "bun:sqlite";
import { SCHEMA } from "./schema";
import { migrate } from "./migrate";

const path = process.env.DATABASE_PATH ?? "./jeleboo.sqlite";

export const db = new Database(path);
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");
db.run(SCHEMA);
migrate(db);