// Jeleboo backend — Bun + Express + TypeScript.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import readingRoutes from "./routes/reading";
import devicesRoutes from "./routes/devices";
import thresholdRoutes from "./routes/threshold";
import notifyRoutes from "./routes/notify";

// Load server/.env.local if present — Bun does not auto-load .env files.
function loadEnvLocal() {
    const path = resolve(process.cwd(), ".env.local");
    try {
        const text = readFileSync(path, "utf8");
        for (const line of text.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
            const idx = trimmed.indexOf("=");
            if (idx <= 0) continue;
            const key = trimmed.slice(0, idx).trim();
            const value = trimmed.slice(idx + 1).trim();
            if (key && !(key in process.env)) process.env[key] = value;
        }
    } catch {
        // No .env.local — rely on the host environment instead.
    }
}

loadEnvLocal();

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api", readingRoutes);
app.use("/api", devicesRoutes);
app.use("/api", thresholdRoutes);
app.use("/api", notifyRoutes);

export function startServer(port?: number) {
    const p = port ?? Number(process.env.PORT) ?? 3000;
    return app.listen(p, () => {
        // eslint-disable-next-line no-console
        console.log(`Jeleboo backend listening on http://localhost:${p}`);
    });
}

// Run directly when invoked as `bun src/server.ts`.
if (import.meta.main) {
    startServer();
}