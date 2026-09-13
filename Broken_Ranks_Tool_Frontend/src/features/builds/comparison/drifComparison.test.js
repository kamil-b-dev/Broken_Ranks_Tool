import { describe, expect, it } from "vitest";
import { createDrifComposition } from "./drifComparison";

const build = (id, itemId) => ({
    id,
    name: id,
    payload: {
        build: {
            requestData: {
                slots: { helmet: { itemId, drifIds: [], drifLevels: {} } },
            },
        },
    },
});

describe("drif comparison", () => {
    it("finds the shared core and compares category and size distributions", () => {
        const left = build("a", 1);
        left.payload.build.requestData.slots.helmet.drifIds = [8, 9, 9];
        left.payload.build.requestData.slots.helmet.drifLevels = { 0: 21, 1: 11, 2: 16 };
        const right = build("b", 2);
        right.payload.build.requestData.slots.helmet.drifIds = [8, 10];
        right.payload.build.requestData.slots.helmet.drifLevels = { 0: 16, 1: 6 };
        const analysis = createDrifComposition(
            [left, right],
            [
                {
                    id: 8,
                    name: "Ling",
                    bonusType: "CRITICAL_CHANCE",
                    category: "OFFENSIVE",
                    size: "SUBDRIF",
                },
                {
                    id: 9,
                    name: "Teld",
                    bonusType: "DAMAGE_REDUCTION",
                    category: "DEFENSIVE",
                    size: "BIDRIF",
                },
                {
                    id: 10,
                    name: "Alom",
                    bonusType: "MANA_REGEN",
                    category: "UTILITY",
                    size: "MAGNIDRIF",
                },
            ]
        );

        expect(analysis.common).toMatchObject([
            { id: "8", name: "Ling", count: 1, minimumLevel: 16, maximumLevel: 21 },
        ]);
        expect(analysis.builds[0].categories.DEFENSIVE).toMatchObject({
            count: 2,
            sizes: { BIDRIF: 2 },
        });
        expect(analysis.outsideCommon[0].entries).toMatchObject([{ id: "9", count: 2 }]);
        expect(analysis.outsideCommon[1].entries).toMatchObject([{ id: "10", count: 1 }]);
    });
});
