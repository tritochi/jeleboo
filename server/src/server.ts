// Jeleboo backend — Bun + Express + TypeScript.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import readingRoutes from "./routes/reading";
import devicesRoutes from "./routes/devices";
import thresholdRoutes from "./routes/threshold";
import notifyRoutes from "./routes/notify";
import pollRoutes from "./routes/poll";
import stationsRoutes from "./routes/stations";
import quietHoursRoutes from "./routes/quiet-hours";
import mapViewRoutes from "./routes/map-view";
import worldOverviewRoutes from "./routes/world-overview";
import { startPollScheduler } from "./jobs/poll";
import { startWorldOverviewScheduler } from "./sources/world-overview";

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

// Railway terminates TLS at one edge proxy before the container, so without
// this Express sees the proxy's address as req.ip — meaning every rate
// limiter keyed on req.ip becomes ONE SHARED BUCKET for all users (a single
// person panning the map can exhaust it alone). trust proxy = 1 hop makes
// req.ip the real client address as recorded by the edge.
app.set("trust proxy", 1);

app.use(express.json());

// ---- CORS (deployed split only) ----
// The browser at https://jeleboo.vercel.app talks cross-origin to the Railway
// backend. The app never uses cookies or browser credentials, so we pin the
// allowed origin(s) rather than reflecting anything. Vercel preview sandboxes
// get *.vercel.app URLs — allow those too. Override via CORS_ALLOWED_ORIGINS
// (comma-separated) if the frontend moves hosts.

const DEFAULT_ALLOWED_ORIGINS = ["https://jeleboo.vercel.app"];

function allowedOrigins(): string[] {
    const fromEnv = process.env.CORS_ALLOWED_ORIGINS;
    if (fromEnv) {
        return fromEnv.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(origin: string | null | undefined): boolean {
    if (!origin) return false;
    if (allowedOrigins().includes(origin)) return true;
    // Vercel preview deployments of this project get *.vercel.app addresses.
    return /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/.test(origin);
}

app.use((req, res, next) => {
    const origin = req.get("Origin");
    if (isAllowedOrigin(origin)) {
        const allowed = origin ?? "";
        res.setHeader("Access-Control-Allow-Origin", allowed);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api", readingRoutes);
app.use("/api", devicesRoutes);
app.use("/api", thresholdRoutes);
app.use("/api", notifyRoutes);
app.use("/api", pollRoutes);
app.use("/api", stationsRoutes);
app.use("/api", quietHoursRoutes);
app.use("/api", mapViewRoutes);
app.use("/api", worldOverviewRoutes);

export function startServer(port?: number) {
    const p = port ?? Number(process.env.PORT) ?? 3000;
    // Deployed hosts (e.g. Railway, which keeps the process alive) set
    // POLL_INTERVAL_MINUTES to run the in-process scheduler; local dev leaves
    // it unset and uses the manual POST /api/jobs/poll/run trigger instead.
    const interval = Number(process.env.POLL_INTERVAL_MINUTES);
    if (Number.isFinite(interval) && interval >= 1) {
        startPollScheduler(Math.round(interval));
    }
    // World overview warm-up (Card 18): only when the host opts in
    // (WORLD_OVERVIEW_HOURS, e.g. 6 on Railway). Local dev relies on the
    // lazy first-fetch instead.
    const worldHours = Number(process.env.WORLD_OVERVIEW_HOURS);
    if (Number.isFinite(worldHours) && worldHours >= 1) {
        startWorldOverviewScheduler(Math.round(worldHours));
    }
    return app.listen(p, () => {
        // eslint-disable-next-line no-console
        console.log(`Jeleboo backend listening on http://localhost:${p}`);
    });
}

// Run directly when invoked as `bun src/server.ts`.
if (import.meta.main) {
    startServer();
}