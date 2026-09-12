// Jeleboo — generates the offline-ready app icons as PNG files.
//
// Simple, calm, on-brand: an off-white background (#FAFAF7, design.md's
// neutral chrome) with a centered solid "air is good" green dot (#2E7D32).
// No text, no fake logo, no invented imagery — per design.md's anti-slop rules
// and Work Card 06. Run:  bun app/scripts/make-icons.ts
//
// Pure-Bun PNG writer: no image library required. Edges are anti-aliased by
// supersampling. Uses node:zlib's deflateSync for the IDAT chunk.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// CWD-independent output dir (script may be run from the repo root or app/).
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/icons");
const SIZES = [192, 512];

interface Rgb {
    r: number;
    g: number;
    b: number;
}

const BG: Rgb = { r: 0xfa, g: 0xfa, b: 0xf7 }; // design.md chrome off-white
const DOT: Rgb = { r: 0x2e, g: 0x7d, b: 0x32 }; // "good air" green

function crc32(data: Uint8Array): number {
    let crc = 0xffff_ffff;
    for (const byte of data) {
        crc ^= byte;
        for (let k = 0; k < 8; k++) {
            crc = (crc >> 1) ^ (0xedb8_8320 & -(crc & 1));
        }
    }
    return crc ^ 0xffff_ffff;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, data.length);

    const typeBytes = new TextEncoder().encode(type);
    const crcTarget = new Uint8Array(typeBytes.length + data.length);
    crcTarget.set(typeBytes, 0);
    crcTarget.set(data, typeBytes.length);

    const crc = new Uint8Array(4);
    new DataView(crc.buffer).setUint32(0, crc32(crcTarget));

    const out = new Uint8Array(4 + typeBytes.length + data.length + 4);
    out.set(len, 0);
    out.set(typeBytes, 4);
    out.set(data, 8);
    out.set(crc, 8 + data.length);
    return out;
}

function makePng(size: number): Uint8Array {
    const SS = 4; // supersampling factor for anti-aliased edges
    const radius = size * 0.4;
    const cx = (size - 1) / 2.0;
    const cy = (size - 1) / 2.0;

    const raw = new Uint8Array(size * (1 + size * 3));
    let p = 0;
    for (let y = 0; y < size; y++) {
        raw[p++] = 0; // filter type: None
        for (let x = 0; x < size; x++) {
            let inside = 0;
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const px = x + (sx + 0.5) / SS;
                    const py = y + (sy + 0.5) / SS;
                    const dx = px - cx;
                    const dy = py - cy;
                    if (dx * dx + dy * dy <= radius * radius) inside++;
                }
            }
            const t = inside / (SS * SS);
            raw[p++] = Math.round(BG.r + (DOT.r - BG.r) * t);
            raw[p++] = Math.round(BG.g + (DOT.g - BG.g) * t);
            raw[p++] = Math.round(BG.b + (DOT.b - BG.b) * t);
        }
    }

    const ihdr = new Uint8Array(13);
    new DataView(ihdr.buffer).setUint32(0, size);
    new DataView(ihdr.buffer).setUint32(4, size);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: truecolour RGB
    // compression=0, filter=0, interlace=0 (already zero)

    const idat = deflateSync(raw); // zlib-wrapped deflate
    const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const parts = [signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
    const total = parts.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const part of parts) {
        out.set(part, off);
        off += part.length;
    }
    return out;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
    const png = makePng(size);
    const path = `${OUT_DIR}/icon-${size}.png`;
    writeFileSync(path, png);
    console.log(`wrote ${path} (${png.length} bytes)`);
}