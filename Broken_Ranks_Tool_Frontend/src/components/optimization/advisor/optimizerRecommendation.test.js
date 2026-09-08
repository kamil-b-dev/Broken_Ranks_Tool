import { describe, expect, it } from "vitest";
import { createRecommendationChanges } from "./optimizerRecommendation";

describe("createRecommendationChanges", () => {
    it("describes purchases and replacements against the current build", () => {
        const changes = createRecommendationChanges({
            currentSlots: {
                helmet: { itemId: 1, drifIds: [10], drifLevels: { 0: 11 } },
            },
            suggestedSlots: {
                helmet: { itemId: 1, drifIds: [20, 30], drifLevels: { 0: 16, 1: 6 } },
            },
            items: [{ id: 1, name: "Hełm" }],
            drifs: [
                { id: 10, name: "Astah" },
                { id: 20, name: "Band" },
                { id: 30, name: "Teld" },
            ],
        });

        expect(changes).toEqual([
            expect.objectContaining({
                itemName: "Hełm",
                fromModifier: "Astah",
                toModifier: "Band",
            }),
            expect.objectContaining({ fromModifier: null, toModifier: "Teld" }),
        ]);
    });
});
