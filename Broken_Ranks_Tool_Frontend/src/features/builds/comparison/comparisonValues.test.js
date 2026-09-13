import { describe, expect, it } from "vitest";
import { formatComparisonValue, toFiniteNumber } from "./comparisonValues";

describe("comparison values", () => {
    it("normalizes numeric values used for comparison", () => {
        expect(toFiniteNumber(12)).toBe(12);
        expect(toFiniteNumber(Number.NaN)).toBeNull();
        expect(toFiniteNumber("12,5%")).toBe(12.5);
        expect(toFiniteNumber("brak")).toBeNull();
    });

    it("formats missing, numeric, and textual values", () => {
        expect(formatComparisonValue(null)).toBe("—");
        expect(formatComparisonValue(12.5)).toBe("12,5");
        expect(formatComparisonValue("15%")).toBe("15%");
    });
});
