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
            originalSlots: slots,
            characterStats: { Siła: 100 },
            priorities: { CRITICAL_CHANCE: 20 },
            targetQuantities: {},
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
});
