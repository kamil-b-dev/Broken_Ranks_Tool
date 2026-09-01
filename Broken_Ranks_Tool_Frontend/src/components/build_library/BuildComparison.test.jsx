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
                requestData: { slots: { helmet: { itemId: 1, itemStars: 5 } } },
            },
        },
        stats: { ATTACK: 100, HP: 500 },
    },
    {
        id: "b",
        name: "PvP",
        payload: {
            build: {
                characterConfig: { level: 120 },
                requestData: { slots: { helmet: { itemId: 2, itemStars: 6 } } },
            },
        },
        stats: { ATTACK: 125, HP: 500 },
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
                bonusTranslations={{ ATTACK: "Atak" }}
            />
        );

        expect(screen.getByText("Hełm ognia")).toBeInTheDocument();
        expect(screen.getByText("Hełm mroku")).toBeInTheDocument();
        await user.click(screen.getByRole("tab", { name: "Statystyki" }));
        expect(screen.getByText("Atak")).toBeInTheDocument();
        expect(screen.getByText("125")).toBeInTheDocument();
        expect(screen.queryByText("HP")).not.toBeInTheDocument();
        await user.click(screen.getByRole("checkbox", { name: "Tylko różnice" }));
        expect(screen.getByText("HP")).toBeInTheDocument();
    });
});
