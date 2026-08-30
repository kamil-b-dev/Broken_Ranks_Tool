import { describe, expect, it } from "vitest";
import {
    doubleIncrement,
    getEquipmentIconClass,
    getVariantLabel,
} from "./itemDatabasePresentation";

describe("itemDatabasePresentation", () => {
    it("creates compact labels for drif and orb variants", () => {
        expect(getVariantLabel({ size: "Magnidrif" })).toBe("M");
        expect(getVariantLabel({ tier: "III" })).toBe("III");
    });

    it("doubles numeric increments while preserving their notation", () => {
        expect(doubleIncrement("+1,5%")).toBe("+3%");
        expect(doubleIncrement("unknown")).toBe("?");
    });

    it("maps localized equipment categories to truthful slot artwork", () => {
        expect(getEquipmentIconClass("Hełmy")).toBe("helmet");
        expect(getEquipmentIconClass("Broń jednoręczna")).toBe("weapon");
        expect(getEquipmentIconClass("Pierścienie")).toBe("ring1");
        expect(getEquipmentIconClass("Nieznana kategoria")).toBe("weapon");
    });
});
