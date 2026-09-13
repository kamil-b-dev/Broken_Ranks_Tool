import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import BuildComparison from "./BuildComparison";

const builds = [
    {
        id: "a",
        name: "PvE",
        payload: {
            build: {
                characterConfig: { level: 140 },
                requestData: {
                    slots: {
                        helmet: {
                            itemId: 1,
                            itemStars: 5,
                            drifIds: [8],
                            drifLevels: { 0: 21 },
                        },
                    },
                },
            },
        },
        stats: {
            ATTACK: 100,
            HP: 500,
            ORB_ATTACK: 3,
            CRITICAL_CHANCE: 8,
            DAMAGE_REDUCTION: 5,
            MANA_REGEN: 3,
        },
        statSources: {
            drifCategories: {
                CRITICAL_CHANCE: "OFFENSIVE",
                DAMAGE_REDUCTION: "DEFENSIVE",
                MANA_REGEN: "UTILITY",
            },
            orbBonusTypes: ["ORB_ATTACK"],
        },
    },
    {
        id: "b",
        name: "PvP",
        payload: {
            build: {
                characterConfig: { level: 120 },
                requestData: {
                    slots: {
                        helmet: {
                            itemId: 2,
                            itemStars: 6,
                            drifIds: [8, 11, 12],
                            drifLevels: { 0: 21, 1: 16, 2: 11 },
                        },
                    },
                },
            },
        },
        stats: {
            ATTACK: 125,
            HP: 500,
            ORB_ATTACK: 3,
            CRITICAL_CHANCE: 10,
            DAMAGE_REDUCTION: 6,
            MANA_REGEN: 4,
        },
        statSources: {
            drifCategories: {
                CRITICAL_CHANCE: "OFFENSIVE",
                DAMAGE_REDUCTION: "DEFENSIVE",
                MANA_REGEN: "UTILITY",
            },
            orbBonusTypes: ["ORB_ATTACK"],
        },
    },
];

describe("BuildComparison", () => {
    it("switches between differing equipment and statistics", async () => {
        const user = userEvent.setup();
        render(
            <BuildComparison
                builds={builds}
                items={[
                    { id: 1, name: "Hełm ognia", tier: "X" },
                    { id: 2, name: "Hełm mroku", tier: "XI" },
                ]}
                drifs={[
                    {
                        id: 8,
                        name: "Ling",
                        bonusType: "CRITICAL_CHANCE",
                        category: "OFFENSIVE",
                        size: "SUBDRIF",
                    },
                    {
                        id: 11,
                        name: "Teld",
                        bonusType: "DAMAGE_REDUCTION",
                        category: "DEFENSIVE",
                        size: "BIDRIF",
                    },
                    {
                        id: 12,
                        name: "Alom",
                        bonusType: "MANA_REGEN",
                        category: "UTILITY",
                        size: "MAGNIDRIF",
                    },
                ]}
                gameRules={{
                    bonusTranslations: {
                        ATTACK: "Atak",
                        ORB_ATTACK: "Atak z orba",
                        CRITICAL_CHANCE: "Szansa na krytyk",
                        DAMAGE_REDUCTION: "Redukcja obrażeń",
                        MANA_REGEN: "Regeneracja many",
                    },
                }}
            />
        );

        expect(screen.getByText("Hełm ognia")).toBeInTheDocument();
        expect(screen.getByText("Hełm mroku")).toBeInTheDocument();
        await user.click(screen.getByRole("tab", { name: "Postać i orby" }));
        expect(screen.getByText("Atak")).toBeInTheDocument();
        expect(screen.getByText("125")).toBeInTheDocument();
        expect(screen.queryByText("HP")).not.toBeInTheDocument();
        expect(screen.queryByText("Atak z orba")).not.toBeInTheDocument();
        await user.click(screen.getByRole("checkbox", { name: "W tabelach: tylko różnice" }));
        expect(screen.getByText("HP")).toBeInTheDocument();
        expect(screen.getByText("Atak z orba")).toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: "Drify" }));
        expect(screen.getByText("Część wspólna")).toBeInTheDocument();
        expect(screen.getAllByText("Ofensywne").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Defensywne").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Użytkowe").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Szansa na krytyk").length).toBeGreaterThan(0);
    });
});
