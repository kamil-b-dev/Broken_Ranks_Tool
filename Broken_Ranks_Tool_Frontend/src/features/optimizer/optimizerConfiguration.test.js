import { describe, expect, it } from "vitest";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    findInvalidSizeConstraint,
    parseOptimizerConfigPayload,
} from "./optimizerConfiguration";

const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk", ARMOR: "Pancerz" },
    drifBasePowers: { CRITICAL_CHANCE: 5, ARMOR: 10 },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE", ARMOR: "DEFENSIVE" },
};

describe("optimizerConfiguration", () => {
    it("normalizes conflicting imported targets and sends only the cap target", () => {
        const imported = parseOptimizerConfigPayload(
            {
                format: "broken-ranks-tool-optimizer-config",
                version: 1,
                priorities: [{ key: "CRITICAL_CHANCE", forceCap: true, maximize: true }],
            },
            gameRules
        );
        expect(imported.priorities[0]).toMatchObject({ forceCap: true, maximize: false });
        const config = buildOptimizationConfig(
            [
                {
                    ...imported.priorities[0],
                    maximize: true,
                    forcePercentage: true,
                    forcedPercentage: 42,
                },
            ],
            { configurationMode: "ADVANCED" }
        );
        expect(config.forceCapBonuses).toEqual(["CRITICAL_CHANCE"]);
        expect(config.maximizeBonuses).toEqual([]);
        expect(config.forcedPercentageTargets).toEqual({});
    });

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
            {
                mode: "ADVISOR",
                forceMaximizationByDrifBonus: true,
                generateVariants: true,
                maxVariantLossPercent: 140,
            },
            new Date("2026-08-30T00:00:00.000Z")
        );

        expect(payload).toMatchObject({
            format: "broken-ranks-tool-optimizer-config",
            version: 1,
            exportedAt: "2026-08-30T00:00:00.000Z",
            settings: {
                mode: "ADVISOR",
                forceMaximizationByDrifBonus: true,
                generateVariants: true,
                maxVariantLossPercent: 100,
            },
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
        expect(imported.mode).toBeNull();
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

    it("normalizes imported advisor protections and removes unknown modifiers", () => {
        const imported = parseOptimizerConfigPayload(
            {
                format: "broken-ranks-tool-optimizer-config",
                version: 1,
                settings: {
                    advisorProtectedModifiers: {
                        CRITICAL_CHANCE: { enabled: true, loss: "2,5" },
                        ARMOR: null,
                        UNKNOWN: { enabled: true, loss: 1 },
                        UNKNOWN_LEGACY: true,
                    },
                },
                priorities: [],
            },
            gameRules
        );

        expect(imported.advisorProtectedModifiers).toEqual({
            CRITICAL_CHANCE: { enabled: true, loss: 2.5 },
        });
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
        expect(
            buildOptimizationConfig(priorities, {
                configurationMode: "ADVANCED",
                generateVariants: true,
            })
        ).toEqual({
            mode: "BUILD_FROM_SCRATCH",
            configurationMode: "ADVANCED",
            priorities: { CRITICAL_CHANCE: 15 },
            targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 12 } },
            forceCapBonuses: [],
            forcedPercentageTargets: { CRITICAL_CHANCE: 42.5 },
            maximizeBonuses: [],
            drifSizeQuantities: {},
            forceMaximizationByDrifBonus: false,
            generateVariants: true,
            maxVariantLossPercent: 0,
        });
        expect(findInvalidPercentageTarget([{ ...priorities[0], forcedPercentage: "" }])).toEqual(
            expect.objectContaining({ key: "CRITICAL_CHANCE" })
        );
    });

    it("builds a restricted simple contract and advanced size ranges", () => {
        const priority = {
            key: "CRITICAL_CHANCE",
            weight: 30,
            min: 2,
            max: 4,
            forceCap: true,
            forcePercentage: true,
            forcedPercentage: 42,
            maximize: true,
            sizeRanges: { SUBDRIF: { min: 2, max: 2 }, ARCYDRIF: { min: 1, max: 2 } },
        };

        expect(buildOptimizationConfig([priority], { configurationMode: "SIMPLE" })).toMatchObject({
            configurationMode: "SIMPLE",
            simpleProfile: "BARBARIAN",
            simpleOptions: { damageDrifs: 7, accuracyDrifs: 6, element: "FIRE" },
            simpleAspects: {},
            priorities: {},
            targetQuantities: {},
            forceCapBonuses: [],
            forcedPercentageTargets: {},
            maximizeBonuses: [],
            drifSizeQuantities: {},
            generateVariants: false,
        });
        expect(
            buildOptimizationConfig([], {
                configurationMode: "SIMPLE",
                simpleProfile: "DRUID",
                simpleOptions: { damageDrifs: 10, accuracyDrifs: 9, style: "DEFENSIVE" },
            })
        ).toMatchObject({
            simpleProfile: "DRUID",
            simpleOptions: expect.objectContaining({
                damageDrifs: 10,
                accuracyDrifs: 9,
                style: "DEFENSIVE",
            }),
            priorities: {},
        });
        expect(
            buildOptimizationConfig([], {
                configurationMode: "SIMPLE",
                simpleProfile: "MAGICAL",
                simpleAspects: { ACCURACY: "IMPORTANT" },
            }).simpleProfile
        ).toBe("VOODOO");
        const advanced = buildOptimizationConfig([priority], { configurationMode: "ADVANCED" });
        expect(advanced.drifSizeQuantities.CRITICAL_CHANCE).toEqual(priority.sizeRanges);
        expect(findInvalidSizeConstraint([{ ...priority, min: 6, max: 6 }])).toBeUndefined();
        expect(
            findInvalidSizeConstraint([
                { ...priority, sizeRanges: { SUBDRIF: { min: 3, max: 2 } } },
            ])
        ).toEqual(expect.objectContaining({ key: "CRITICAL_CHANCE" }));
        expect(
            findInvalidSizeConstraint([
                {
                    ...priority,
                    min: 1,
                    max: 6,
                    sizeRanges: Object.fromEntries(
                        ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"].map((size) => [
                            size,
                            { min: 0, max: 0 },
                        ])
                    ),
                },
            ])
        ).toEqual(expect.objectContaining({ key: "CRITICAL_CHANCE", min: 1, max: 6 }));
    });
});
