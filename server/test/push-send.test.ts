// Jeleboo — bun test for the push payload builder. `crossingPayload` is pure
// (no network, no VAPID keys needed), so it is tested directly. Per
// architecture.md's Testing Strategy, this test is written as part of the
// card that introduces the behaviour.

import { describe, it, expect } from "bun:test";
import { crossingPayload } from "../src/push/send";

describe("crossingPayload", () => {
    it("builds a plain-language crossed_above payload", () => {
        const p = crossingPayload(150, "Kuala Lumpur", "crossed_above");
        expect(p.title).toBe("Air quality crossed your threshold");
        expect(p.body).toContain("150");
        expect(p.body).toContain("Kuala Lumpur");
        expect(p.tag).toBe("jeleboo-crossing");
        expect(p.data?.state).toBe("crossed_above");
    });

    it("builds a cleared payload when the reading drops back down", () => {
        const p = crossingPayload(80, "Petaling Jaya", "cleared");
        expect(p.title).toBe("Air quality dropped back down");
        expect(p.body).toContain("80");
        expect(p.body).toContain("Petaling Jaya");
        expect(p.tag).toBe("jeleboo-cleared");
        expect(p.data?.state).toBe("cleared");
    });
});