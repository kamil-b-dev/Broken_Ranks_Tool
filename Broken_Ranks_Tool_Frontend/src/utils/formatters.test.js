import { describe, expect, it } from "vitest";
import { formatGroupLabel, getDrifMaxLvl, getRarityColor, getStarColor } from "./formatters";

describe("equipment display formatters", () => {
    it.each([
        [undefined, "text-stone-300"],
        ["set", "text-green-700 font-bold"],
        ["EPIC", "text-yellow-500 font-bold"],
        ["legendary", "text-orange-500 font-bold"],
        ["RARE", "text-blue-700 font-bold"],
        ["COMMON", "text-stone-300"],
    ])("maps rarity %s to its visual style", (rarity, expected) => {
        expect(getRarityColor(rarity)).toBe(expected);
    });

    it.each([
        [1, false, "text-stone-700"],
        [3, true, "text-yellow-900"],
        [6, true, "text-gray-400"],
        [9, true, "text-amber-500"],
    ])("maps star %s to its visual style", (star, filled, expected) => {
        expect(getStarColor(star, filled)).toBe(expected);
    });

    it.each([
        [undefined, 21],
        ["subdrif", 6],
        ["BIDRIF", 11],
        ["magnidrif", 16],
        ["ARCYDRIF", 21],
        ["unknown", 21],
    ])("returns the level limit for %s", (size, expected) => {
        expect(getDrifMaxLvl(size)).toBe(expected);
    });

    it("uses a translated group label when available", () => {
        expect(formatGroupLabel("CRIT", [], { CRIT: "Krytyk" })).toBe("Krytyk");
        expect(formatGroupLabel("MANA", [], {})).toBe("MANA");
    });
});
