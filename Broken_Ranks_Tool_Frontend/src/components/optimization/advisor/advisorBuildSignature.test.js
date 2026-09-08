import { describe, expect, it } from "vitest";
import { advisorBuildSignature } from "./advisorBuildSignature";

describe("advisorBuildSignature", () => {
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
