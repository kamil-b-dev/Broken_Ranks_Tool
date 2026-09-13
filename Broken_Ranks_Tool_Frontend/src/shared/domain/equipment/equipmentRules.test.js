import { describe, expect, it } from "vitest";
import { getDrifMaxLevel } from "./equipmentRules";

describe("equipmentRules", () => {
    it.each([
        [undefined, 21],
        ["subdrif", 6],
        ["BIDRIF", 11],
        ["magnidrif", 16],
        ["ARCYDRIF", 21],
        ["unknown", 21],
    ])("returns the level limit for %s", (size, expected) => {
        expect(getDrifMaxLevel(size)).toBe(expected);
    });
});
