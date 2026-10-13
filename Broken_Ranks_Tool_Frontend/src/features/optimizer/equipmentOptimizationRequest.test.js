import { describe, expect, it } from "vitest";
import { createEquipmentOptimizationRequest } from "./equipmentOptimizationRequest";

describe("createEquipmentOptimizationRequest", () => {
    it("sends selected loose drifs only in the advanced inventory mode", () => {
        const backpack = [
            { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true },
            { id: "unused", kind: "DRIF", templateId: "60", level: 2 },
            { id: "orb", kind: "ORB", templateId: "50", level: 1 },
        ];
        const input = {
            slots: { helmet: { itemId: 1 } },
            backpack,
            configuration: {
                configurationMode: "ADVANCED",
                backpackOnly: true,
                generateVariants: true,
            },
            lockedSlots: [],
            lockedDrifs: {},
        };
        expect(createEquipmentOptimizationRequest(input)).toMatchObject({
            backpackOnly: true,
            generateVariants: false,
            backpackDrifs: [{ id: "owned", templateId: 60, level: 6 }],
        });
        expect(
            createEquipmentOptimizationRequest({
                ...input,
                configuration: { ...input.configuration, configurationMode: "SIMPLE" },
            })
        ).not.toHaveProperty("backpackDrifs");
        expect(
            createEquipmentOptimizationRequest({
                ...input,
                configuration: { ...input.configuration, mode: "ADVISOR" },
            })
        ).not.toHaveProperty("backpackDrifs");
    });
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
                simpleProfile: "VOODOO",
                simpleOptions: { damageDrifs: 7, accuracyDrifs: 7 },
            },
            lockedSlots: [],
            lockedDrifs: {},
        });

        expect(request).toMatchObject({
            configurationMode: "SIMPLE",
            priorities: {},
            simpleProfile: "VOODOO",
            simpleOptions: { damageDrifs: 7, accuracyDrifs: 7 },
            simpleAspects: {},
        });
    });
});
