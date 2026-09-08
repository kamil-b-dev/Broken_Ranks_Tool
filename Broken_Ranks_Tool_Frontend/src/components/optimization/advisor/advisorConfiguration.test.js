import { describe, expect, it } from "vitest";
import {
    advisorModifiers,
    buildAdvisorConfiguration,
    selectedAdvisorGoal,
} from "./advisorConfiguration";
import {
    createOptimizerConfigPayload,
    parseOptimizerConfigPayload,
} from "../optimizerConfiguration";

const rules = {
    bonusTranslations: {
        CRITICAL_CHANCE: "Krytyk",
        MANA_USAGE_REDUCTION: "Zużycie many",
        DAMAGE_MAGIC: "Obrażenia",
    },
    drifBasePowers: { CRITICAL_CHANCE: 4, MANA_USAGE_REDUCTION: 2, DAMAGE_MAGIC: 3 },
};

describe("advisor configuration", () => {
    it("allows absent modifiers and preserves the sign of reductions", () => {
        const mods = advisorModifiers({ MANA_USAGE_REDUCTION: "-12,5%" }, rules);
        expect(mods.find(({ key }) => key === "DAMAGE_MAGIC").value).toBe(0);
        expect(mods.find(({ key }) => key === "MANA_USAGE_REDUCTION").value).toBe(-12.5);
        expect(selectedAdvisorGoal(mods, "DAMAGE_MAGIC")).toBe("DAMAGE_MAGIC");
        expect(selectedAdvisorGoal(mods, "INVALID")).toBe("MANA_USAGE_REDUCTION");
    });
    it("sends relative protection and a separate target instead of frozen minima", () => {
        const config = buildAdvisorConfiguration(
            {
                advisorGoal: "DAMAGE_MAGIC",
                advisorSearch: { targetMode: "GAIN", target: "2,5" },
                advisorProtectedModifiers: { CRITICAL_CHANCE: { loss: "0.1" } },
            },
            { CRITICAL_CHANCE: "20%" },
            rules,
            { Moc: 100 }
        );
        expect(config).toMatchObject({
            priorities: { DAMAGE_MAGIC: 30 },
            characterStats: { Moc: 100 },
            advisor: {
                goal: "DAMAGE_MAGIC",
                targetGain: 2.5,
                protectedModifiers: { CRITICAL_CHANCE: { enabled: true, loss: 0.1 } },
                allowedChanges: { stars: true, drifs: false, items: false },
            },
        });
        expect(config.advisorScenarios).toBeUndefined();
        expect(config.forcedPercentageTargets).toBeUndefined();
    });
    it.each(["", "bad", -1, Infinity])("rejects invalid targets %s", (target) => {
        expect(() =>
            buildAdvisorConfiguration({ advisorSearch: { targetMode: "VALUE", target } }, {}, rules)
        ).toThrow();
    });
    it("round trips the target and allowed purchase controls", () => {
        const settings = {
            mode: "ADVISOR",
            advisorGoal: "DAMAGE_MAGIC",
            advisorSearch: { targetMode: "VALUE", target: 30, timeBudgetMs: 5000, maxActions: 2 },
            advisorAllowedChanges: { drifs: true, drifUpgrades: true },
        };
        const restored = parseOptimizerConfigPayload(
            createOptimizerConfigPayload([], settings),
            rules
        );
        expect(restored).toMatchObject({
            advisorSearch: settings.advisorSearch,
            advisorAllowedChanges: settings.advisorAllowedChanges,
        });
    });
});
