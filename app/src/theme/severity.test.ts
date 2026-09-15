// Triple-slash ref: bun:test types live in bun-types, which is a dev-only dep —
// referencing it here (instead of tsconfig "types") keeps Bun globals out of the
// browser app's type universe. This file is never imported by app code and never
// bundled; vite build doesn't typecheck.
/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { classifyAqi, isHazardous } from "./severity";

describe("classifyAqi — six-band US EPA/WAQI boundaries", () => {
    test("every band boundary lands on the right band", () => {
        expect(classifyAqi(0).band).toBe("good");
        expect(classifyAqi(50).band).toBe("good");
        expect(classifyAqi(51).band).toBe("moderate");
        expect(classifyAqi(100).band).toBe("moderate");
        expect(classifyAqi(101).band).toBe("usg");
        expect(classifyAqi(150).band).toBe("usg");
        expect(classifyAqi(151).band).toBe("unhealthy");
        expect(classifyAqi(200).band).toBe("unhealthy");
        expect(classifyAqi(201).band).toBe("very-unhealthy");
        expect(classifyAqi(299).band).toBe("very-unhealthy");
        expect(classifyAqi(300).band).toBe("hazardous");
        expect(classifyAqi(301).band).toBe("hazardous");
    });

    test("labels are always present (colour never carries meaning alone)", () => {
        for (const aqi of [0, 50, 51, 100, 101, 150, 151, 200, 201, 299, 300, 500]) {
            expect(classifyAqi(aqi).label.length).toBeGreaterThan(0);
        }
    });

    test("non-finite input degrades to 'No reading', never a band", () => {
        for (const bad of [NaN, Infinity, -Infinity]) {
            expect(classifyAqi(bad).band).toBe("good");
            expect(classifyAqi(bad).label).toBe("No reading");
        }
    });
});

describe("isHazardous — must agree with the 300+ hazardous band", () => {
    test("300 and above only", () => {
        expect(isHazardous(299)).toBe(false);
        expect(isHazardous(300)).toBe(true);
        expect(isHazardous(500)).toBe(true);
        expect(isHazardous(NaN)).toBe(false);
    });

    test("displayed band and the alert flag never disagree", () => {
        for (const aqi of [50, 299, 300, 301, 750]) {
            expect(classifyAqi(aqi).band === "hazardous").toBe(isHazardous(aqi));
        }
    });
});