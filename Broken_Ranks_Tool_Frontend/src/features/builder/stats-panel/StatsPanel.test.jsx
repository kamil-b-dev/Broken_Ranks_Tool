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

        const orbsTab = screen.getByRole("tab", { name: "Orby" });
        expect(orbsTab).toHaveAttribute("aria-controls", "stats-result-panel");
        await user.click(orbsTab);
        expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", orbsTab.id);
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
        const { container, rerender } = render(
            <StatsPanel stats={null} onCalculate={vi.fn()} gameRules={{}} />
        );
        expect(container.querySelector(".stats-empty-state img")).toBeInTheDocument();
        expect(screen.queryByText("Wybierz ekwipunek")).not.toBeInTheDocument();
        expect(
            screen.queryByText("Gotowy build przeliczysz przyciskiem powyżej.")
        ).not.toBeInTheDocument();

        rerender(<StatsPanel stats={{}} onCalculate={vi.fn()} isCalculating gameRules={{}} />);
        expect(screen.getByRole("button", { name: "Przeliczanie..." })).toBeDisabled();
    });
});
