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

    it("describes item, star, orb, and leveled drif changes", () => {
        const changes = createRecommendationChanges({
            currentSlots: {
                helmet: {
                    itemId: 1,
                    itemStars: 3,
                    orbIds: [100],
                    orbLevels: [1],
                    drifIds: [10],
                    drifLevels: { 0: 6 },
                },
                boots: { itemId: 3, itemStars: 2 },
            },
            suggestedSlots: {
                helmet: {
                    itemId: 2,
                    itemStars: 8,
                    orbIds: [200],
                    orbLevels: [3],
                    drifIds: [10],
                    drifLevels: { 0: 11 },
                },
                boots: { itemId: 3, itemStars: 7 },
            },
            items: [
                { id: 1, name: "Stary hełm" },
                { id: 2, name: "Nowy hełm" },
                { id: 3, name: "Buty" },
            ],
            drifs: [{ id: 10, name: "Astah", size: "SUBDRIF" }],
            orbs: [
                { id: 100, name: "Stary orb" },
                { id: 200, name: "Nowy orb" },
            ],
        });

        expect(changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    itemName: "Nowy hełm",
                    fromModifier: "Przedmiot: Stary hełm",
                    toModifier: "Przedmiot: Nowy hełm",
                }),
                expect.objectContaining({
                    fromModifier: "Orb: Stary orb",
                    fromLevel: 1,
                    toModifier: "Orb: Nowy orb",
                    toLevel: 3,
                }),
                expect.objectContaining({
                    fromModifier: "SUBDRIF Astah",
                    fromLevel: 6,
                    toModifier: "SUBDRIF Astah",
                    toLevel: 11,
                }),
                expect.objectContaining({
                    itemName: "Buty",
                    fromModifier: "Gwiazdki: 2",
                    toModifier: "Gwiazdki: 7",
                }),
            ])
        );
    });

    it("uses stable fallbacks for unknown catalog entries and missing slots", () => {
        const changes = createRecommendationChanges({
            currentSlots: { helmet: { itemId: 999, orbIds: [888], drifIds: [777] } },
            suggestedSlots: {},
            items: [],
            drifs: [],
            orbs: [],
        });

        expect(changes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ itemName: "helmet", fromModifier: null }),
                expect.objectContaining({ fromModifier: "Orb: 888", toModifier: null }),
                expect.objectContaining({ fromModifier: null, toModifier: null }),
            ])
        );
    });
});
