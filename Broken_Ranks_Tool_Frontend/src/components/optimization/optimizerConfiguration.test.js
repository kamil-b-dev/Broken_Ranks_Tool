import { describe, expect, it } from "vitest";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    parseOptimizerConfigPayload,
} from "./optimizerConfiguration";

const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk", ARMOR: "Pancerz" },
    drifBasePowers: { CRITICAL_CHANCE: 5, ARMOR: 10 },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE", ARMOR: "DEFENSIVE" },
};

describe("optimizerConfiguration", () => {
    it("creates a versioned and normalized export payload", () => {
        const payload = createOptimizerConfigPayload(
            [
                {
                    key: "ARMOR",
                    weight: "20",
                    min: "1",
                    max: "4",
                    forceCap: false,
                    forcePercentage: false,
                    forcedPercentage: "",
                    maximize: true,
                },
            ],
            { maxVariantLossPercent: 140 },
            new Date("2026-08-30T00:00:00.000Z")
        );

        expect(payload).toMatchObject({
            format: "broken-ranks-tool-optimizer-config",
            version: 1,
            exportedAt: "2026-08-30T00:00:00.000Z",
            settings: { maxVariantLossPercent: 100 },
            priorities: [{ key: "ARMOR", weight: 20, min: 1, max: 4, maximize: true }],
        });
    });

    it("imports only known unique bonuses and clamps editable values", () => {
        const imported = parseOptimizerConfigPayload(
            {
                format: "broken-ranks-tool-optimizer-config",
                version: 1,
                settings: { maxVariantLossPercent: -5 },
                priorities: [
                    { key: "CRITICAL_CHANCE", weight: 99, min: -2, max: 80, forceCap: true },
                    { key: "CRITICAL_CHANCE", weight: 1 },
                    { key: "UNKNOWN", weight: 10 },
                ],
            },
            gameRules
        );

        expect(imported.priorities).toEqual([
            expect.objectContaining({
                key: "CRITICAL_CHANCE",
                weight: 30,
                min: 0,
                max: 12,
                forceCap: true,
            }),
        ]);
        expect(imported.availableBonuses.map(({ key }) => key)).toEqual(["ARMOR"]);
        expect(imported.maxVariantLossPercent).toBe(0);
    });

    it("rejects unsupported files and files without current bonuses", () => {
        expect(() => parseOptimizerConfigPayload({ priorities: [] }, gameRules)).toThrow(
            /Nieobsługiwany format/
        );
        expect(() =>
            parseOptimizerConfigPayload(
                {
                    format: "broken-ranks-tool-optimizer-config",
                    version: 1,
                    priorities: [{ key: "UNKNOWN" }],
                },
                gameRules
            )
        ).toThrow(/nie zawiera bonusów/);
    });

    it("builds the backend contract and detects invalid percentage targets", () => {
        const priorities = [
            {
                key: "CRITICAL_CHANCE",
                weight: "15",
                min: "-3",
                max: "99",
                forceCap: false,
                forcePercentage: true,
                forcedPercentage: "42.5",
                maximize: true,
            },
        ];

        expect(findInvalidPercentageTarget(priorities)).toBeUndefined();
        expect(buildOptimizationConfig(priorities, { generateVariants: true })).toEqual({
            priorities: { CRITICAL_CHANCE: 15 },
            targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 12 } },
            forceCapBonuses: [],
            forcedPercentageTargets: { CRITICAL_CHANCE: 42.5 },
            maximizeBonuses: [],
            forceMaximizationByDrifBonus: false,
            generateVariants: true,
            maxVariantLossPercent: 0,
        });
        expect(findInvalidPercentageTarget([{ ...priorities[0], forcedPercentage: "" }])).toEqual(
            expect.objectContaining({ key: "CRITICAL_CHANCE" })
        );
    });
});
