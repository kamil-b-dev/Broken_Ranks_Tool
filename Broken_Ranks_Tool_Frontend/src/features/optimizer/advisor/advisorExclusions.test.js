import { describe, expect, it } from "vitest";
import { buildAdvisorConfiguration } from "./advisorConfiguration";
import {
    createOptimizerConfigPayload,
    parseOptimizerConfigPayload,
    mergeOptimizerSettings,
} from "../optimizerConfiguration";
const rules = {
    bonusTranslations: { CRITICAL_CHANCE: "Krytyk" },
    drifBasePowers: { CRITICAL_CHANCE: 1 },
};
describe("advisor exclusions", () => {
    it("preserves explicit exclusions through requests and configuration files", () => {
        const settings = {
            mode: "ADVISOR",
            advisorGoal: "CRITICAL_CHANCE",
            advisorExclusions: { itemIds: [12], purchaseBonusTypes: ["CRITICAL_CHANCE"] },
        };
        const config = buildAdvisorConfiguration(settings, { CRITICAL_CHANCE: "2%" }, rules, {});
        expect(config.advisor.excludedItemIds).toEqual([12]);
        expect(config.advisor.excludedPurchaseBonusTypes).toEqual(["CRITICAL_CHANCE"]);
        const parsed = parseOptimizerConfigPayload(
            createOptimizerConfigPayload([], settings),
            rules
        );
        expect(mergeOptimizerSettings({}, parsed).advisorExclusions).toEqual(
            settings.advisorExclusions
        );
    });
});
