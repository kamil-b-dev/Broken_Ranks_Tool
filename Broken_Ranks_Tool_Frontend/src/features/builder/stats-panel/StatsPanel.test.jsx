import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StatsPanel from "./StatsPanel";

const gameRules = {
    bonusTranslations: {
        STRENGTH: "Siła dodatkowa",
        DAMAGE_FIRE: "Obrażenia od ognia",
        CRITICAL_CHANCE: "Szansa krytyczna",
    },
    drifBonusCategories: { DAMAGE_FIRE: "OFFENSIVE" },
};

describe("StatsPanel", () => {
    it("groups base, drif and orb statistics and recalculates them", async () => {
        const user = userEvent.setup();
        const onCalculate = vi.fn();
        render(
            <StatsPanel
                stats={{
                    Siła: 12,
                    PŻ: 230,
                    DAMAGE_FIRE: 4.5,
                    CRITICAL_CHANCE: 0.125,
                    "Bonus drify": 99,
                    Pojemność: 10,
                }}
                onCalculate={onCalculate}
                gameRules={gameRules}
                statSources={{
                    drifCategories: { DAMAGE_FIRE: "OFFENSIVE" },
                    orbBonusTypes: ["CRITICAL_CHANCE"],
                }}
            />
        );

        expect(screen.getByRole("heading", { name: "Statystyki podstawowe" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Drify" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Orby" })).toBeInTheDocument();
        expect(screen.getByText("Obrażenia od ognia")).toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: "Orby" }));
        expect(screen.getByRole("heading", { name: "Orby" })).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Statystyki podstawowe" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Drify" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: "Wszystko" }));
        expect(screen.getByRole("heading", { name: "Statystyki podstawowe" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Przelicz statystyki" }));
        expect(onCalculate).toHaveBeenCalledOnce();
    });

    it("shows empty and calculating states", () => {
        const { rerender } = render(
            <StatsPanel stats={null} onCalculate={vi.fn()} gameRules={{}} />
        );
        expect(screen.getByText("Wybierz ekwipunek")).toBeInTheDocument();

        rerender(<StatsPanel stats={{}} onCalculate={vi.fn()} isCalculating gameRules={{}} />);
        expect(screen.getByRole("button", { name: "Przeliczanie..." })).toBeDisabled();
    });
});
