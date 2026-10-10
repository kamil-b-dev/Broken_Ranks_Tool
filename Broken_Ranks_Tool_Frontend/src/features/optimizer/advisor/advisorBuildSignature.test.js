import { describe, expect, it } from "vitest";
import { advisorBuildSignature } from "./advisorBuildSignature";

describe("advisorBuildSignature", () => {
    it("uses one star when a valid build omits the explicit default", () => {
        const expected = advisorBuildSignature({ helmet: { itemId: 1, itemStars: 1 } });
        for (const itemStars of [undefined, null, "1", 1]) {
            expect(advisorBuildSignature({ helmet: { itemId: "1", itemStars } })).toBe(expected);
        }
        expect(advisorBuildSignature({ helmet: { itemId: 1, itemStars: 0 } })).not.toBe(expected);
    });
    const baseline = { helmet: { itemId: 1, itemStars: 7, drifIds: [10], drifLevels: { 0: 6 } } };
    it("recognizes backend results after editor normalization", () => {
        expect(
            advisorBuildSignature({
                boots: { itemId: "" },
                helmet: {
                    itemId: "1",
                    itemStars: "7",
                    drifIds: ["10", ""],
                    drifLevels: { 0: "6", 1: 1 },
                    orbIds: ["", ""],
                },
            })
        ).toBe(advisorBuildSignature(baseline));
    });
    it("rejects changes to stars, drif levels and placement", () => {
        for (const change of [
            { itemStars: 8 },
            { drifLevels: { 0: 7 } },
            { drifIds: [null, 10] },
        ]) {
            expect(advisorBuildSignature({ helmet: { ...baseline.helmet, ...change } })).not.toBe(
                advisorBuildSignature(baseline)
            );
        }
    });
});
