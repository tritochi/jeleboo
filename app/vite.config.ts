import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(configDir, "dist");

// Work Card 06 — the service worker precaches the app shell. Vite hashes the
// built JS/CSS filenames per build, so sw.js's precache list can't be written
// by hand. This plugin fills the `/* __PRECACHE_BUILT__ */` marker in the
// built dist/sw.js with the real /assets/* filenames from this build, so the
// app shell — including the hashed bundle — is available fully offline.
const jelebooSwPrecache: Plugin = {
    name: "jeleboo-sw-precache",
    closeBundle() {
        const swPath = resolve(DIST, "sw.js");
        if (!existsSync(swPath)) return;
        const assetsDir = resolve(DIST, "assets");
        const files = existsSync(assetsDir)
            ? readdirSync(assetsDir)
                  .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
                  .sort()
            : [];
        const lines = files.map((f) => `    "/assets/${f}",`).join("\n");
        const source = readFileSync(swPath, "utf8");
        const marker = "/* __PRECACHE_BUILT__ */";
        if (source.includes(marker)) {
            writeFileSync(swPath, source.replace(marker, lines), "utf8");
        }
    },
};

export default defineConfig({
  plugins: [react(), jelebooSwPrecache],
  base: "/",
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Dev-only: keep the frontend same-origin for /api/*, matching the
      // service worker's network-first /api/* pattern. Production sets
      // VITE_BACKEND_URL on the static host instead.
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    modulePreload: true,
  },
});