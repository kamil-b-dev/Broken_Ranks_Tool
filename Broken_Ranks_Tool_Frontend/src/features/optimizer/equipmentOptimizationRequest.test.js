import { describe, expect, it } from "vitest";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";

describe("createEquipmentOptimizationRequest", () => {
    it("normalizes optional optimizer fields for the backend contract", () => {
        const slots = { helmet: { itemId: 7 } };
        const request = createEquipmentOptimizationRequest({
            slots,
            characterStats: { Siła: 100 },
            configuration: {
                priorities: { CRITICAL_CHANCE: 20 },
                forceMaximizationByDrifBonus: 1,
                generateVariants: 0,
                maxVariantLossPercent: "12.5",
            },
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });

        expect(request).toEqual({
            mode: "BUILD_FROM_SCRATCH",
            configurationMode: "ADVANCED",
            originalSlots: slots,
            characterStats: { Siła: 100 },
            priorities: { CRITICAL_CHANCE: 20 },
            targetQuantities: {},
            drifSizeQuantities: {},
            forceCapBonuses: [],
            forcedPercentageTargets: {},
            maximizeBonuses: [],
            forceMaximizationByDrifBonus: true,
            generateVariants: false,
            maxVariantLossPercent: 12.5,
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });
    });

    it("forwards simple profile choices without advanced priorities", () => {
        const request = createEquipmentOptimizationRequest({
            slots: { armor: { itemId: 4 } },
            configuration: {
                configurationMode: "SIMPLE",
                simpleProfile: "MAGICAL",
                simpleAspects: { DAMAGE: "IMPORTANT", RESOURCES: "KEY" },
            },
            lockedSlots: [],
            lockedDrifs: {},
        });

        expect(request).toMatchObject({
            configurationMode: "SIMPLE",
            priorities: {},
            simpleProfile: "MAGICAL",
            simpleAspects: { DAMAGE: "IMPORTANT", RESOURCES: "KEY" },
        });
    });
});
