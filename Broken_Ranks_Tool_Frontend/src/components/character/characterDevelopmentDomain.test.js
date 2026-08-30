import { describe, expect, it } from "vitest";
import { calculateCharacterStats, normalizeCharacterConfig, trimSpentPoints } from "./characterDevelopmentDomain";

describe("characterDevelopmentDomain", () => {
    it("normalizes imported levels and point allocations", () => {
        const result = normalizeCharacterConfig({ level: 999, spentPoints: { Siła: 3, Moc: -2 } });
        expect(result.level).toBe(140);
        expect(result.spentPoints).toMatchObject({ Siła: 3, Moc: 0, PŻ: 0 });
    });

    it("removes excess points fairly when the level drops", () => {
        const trimmed = trimSpentPoints({ Siła: 3, Moc: 2, PŻ: 0 }, 2);
        expect(Object.values(trimmed).reduce((sum, value) => sum + value, 0)).toBe(2);
        expect(trimmed).toEqual({ Siła: 1, Moc: 1, PŻ: 0 });
    });

    it("calculates final values using each statistic ratio", () => {
        expect(calculateCharacterStats({ Siła: 2, Zręczność: 0, Moc: 0, Wiedza: 0, PŻ: 2, Mana: 0, Kondycja: 0 })).toMatchObject({ Siła: 12, PŻ: 220 });
    });
});
