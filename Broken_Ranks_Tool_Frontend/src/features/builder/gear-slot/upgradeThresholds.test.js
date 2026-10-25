import { describe, expect, it } from "vitest";
import { nextItemThreshold, nextDrifThreshold } from "./upgradeThresholds";

describe("upgrade thresholds", () => {
    it("finds the extra tier II socket and never invents capacity for zero-capacity items", () => {
        expect(nextItemThreshold({ rarity: "RARE", tier: "II", capacity: 0 }, 6)).toEqual({
            stars: 7,
            capacityBefore: 0,
            capacity: 0,
            socketsBefore: 1,
            sockets: 2,
        });
        expect(nextItemThreshold({ rarity: "RARE", tier: "X", capacity: 15 }, 8)).toMatchObject({
            stars: 9,
            capacityBefore: 17,
            capacity: 19,
            sockets: 3,
        });
        expect(nextItemThreshold({ rarity: "EPIC", tier: "X", capacity: 15 }, 1)).toBeNull();
        expect(nextItemThreshold({ rarity: "RARE", tier: "I", capacity: 0 }, 1)).toBeNull();
    });
    it("accounts for other stones when crossing a power threshold, independently of stone size", () => {
        const next = nextDrifThreshold({ size: "ARCYDRIF" }, 6, 3, 10, 11);
        expect(next).toMatchObject({
            plateau: 11,
            powerLevel: 7,
            powerBefore: 3,
            powerAfter: 6,
            usedAfter: 13,
            missing: 2,
        });
        expect(nextDrifThreshold({ size: "BIDRIF" }, 11, 3, 6, 20)).toMatchObject({
            maximum: 11,
            plateau: undefined,
            powerLevel: undefined,
        });
        expect(
            nextDrifThreshold({ size: "MAGNIDRIF" }, 12, undefined, 0, 10).powerAfter
        ).toBeNull();
    });
});
