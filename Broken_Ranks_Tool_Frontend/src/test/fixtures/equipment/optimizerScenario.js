import { builderCatalog } from "./builderCatalog";

export const optimizerCatalog = {
    ...builderCatalog,
    drifs: builderCatalog.drifs.map((drif) => ({ ...drif, baseValue: "10%", increment: "0%" })),
    gameRules: {
        ...builderCatalog.gameRules,
        drifBasePowers: { CRITICAL_CHANCE: 4, MANA_USAGE_REDUCTION: 2 },
        bonusTranslations: {
            CRITICAL_CHANCE: "Szansa na krytyk",
            MANA_USAGE_REDUCTION: "Redukcja zużycia many",
        },
        drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE", MANA_USAGE_REDUCTION: "UTILITY" },
        drifMaxCaps: { CRITICAL_CHANCE: 60, MANA_USAGE_REDUCTION: -60 },
    },
};
export const optimizerBuild = {
    requestData: {
        slots: {
            helmet: {
                itemId: 1,
                itemStars: 6,
                drifIds: [60],
                drifLevels: { 0: 6 },
                orbIds: [],
                orbLevels: [],
            },
            boots: {
                itemId: 5,
                itemStars: 9,
                drifIds: [],
                drifLevels: {},
                orbIds: [],
                orbLevels: [],
            },
        },
        characterStats: {},
    },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
};
const suggestedSlots = {
    helmet: { ...optimizerBuild.requestData.slots.helmet, drifIds: [], drifLevels: {} },
    boots: { ...optimizerBuild.requestData.slots.boots, drifIds: [60], drifLevels: { 0: 6 } },
};
export const optimizerResponse = (advisory = false, status = "BEST_FOUND") => ({
    optimizedSetup: { slots: suggestedSlots },
    calculationResult: { stats: { CRITICAL_CHANCE: "13.5%", MANA_USAGE_REDUCTION: "-10%" } },
    summary: {
        success: true,
        message: "Znaleziono najlepszy sprawdzony układ. Brak dowodu globalnego optimum.",
        warnings: ["Cel 60% nie został osiągnięty; pokazano najlepszy znaleziony poprawny build."],
        goalResults: [
            {
                statKey: "CRITICAL_CHANCE",
                bonusName: "Szansa na krytyk",
                priority: 30,
                minimumCount: 0,
                maximumCount: 12,
                placedCount: 1,
                calculatorValue: "13.5%",
                targetLabel: "60%",
            },
        ],
        itemsByDrifBonus: {},
        nextVariants: [
            {
                main: true,
                bonusName: "Przełożenie posiadanego drifa",
                finalValue: 12,
                variantValue: 13.5,
                gain: 1.5,
                changeCount: 1,
                setup: { slots: suggestedSlots },
                calculationResult: {
                    stats: { CRITICAL_CHANCE: "13.5%", MANA_USAGE_REDUCTION: "-10%" },
                },
                changes: [
                    {
                        slotKey: "boots",
                        itemName: "Buty podróżnika",
                        toModifier: "Band",
                        toLevel: 6,
                    },
                ],
                statChanges: [
                    { statKey: "CRITICAL_CHANCE", finalValue: "12%", variantValue: "13.5%" },
                ],
            },
        ],
    },
    ...(advisory
        ? {
              advisorReport: {
                  status,
                  goal: "CRITICAL_CHANCE",
                  evaluatedStates: 120,
                  verifiedCandidates: 1,
                  candidateCount: 1,
                  maxActions: 3,
                  proofComplete: false,
                  plans: [
                      {
                          kind: "MOVES",
                          actions: ["Przenieś SUBDRIF Band 6 z hełmu do butów, gniazdo 1."],
                          drifCounts: { CRITICAL_CHANCE: 1 },
                      },
                  ],
              },
          }
        : {}),
});
