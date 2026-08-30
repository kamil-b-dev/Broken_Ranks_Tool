import { describe, expect, it } from "vitest";
import { doubleIncrement, getVariantLabel } from "./itemDatabasePresentation";

describe("itemDatabasePresentation", () => {
    it("creates compact labels for drif and orb variants", () => {
        expect(getVariantLabel({ size: "Magnidrif" })).toBe("M");
        expect(getVariantLabel({ tier: "III" })).toBe("III");
    });

    it("doubles numeric increments while preserving their notation", () => {
        expect(doubleIncrement("+1,5%")).toBe("+3%");
        expect(doubleIncrement("unknown")).toBe("?");
    });
});
