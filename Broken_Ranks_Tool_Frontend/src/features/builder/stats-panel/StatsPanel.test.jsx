import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StatsPanel from "./StatsPanel";
import { LanguageContext } from "../../../shared/i18n/LanguageContext";

const gameRules = {
    bonusTranslations: {
        STRENGTH: "Siła dodatkowa",
        DAMAGE_FIRE: "Obrażenia od ognia",
        CRITICAL_CHANCE: "Szansa krytyczna",
    },
    drifBonusCategories: { DAMAGE_FIRE: "OFFENSIVE" },
};

describe("StatsPanel", () => {
    it.each([
        ["CRITICAL_CHANCE", "78%", 60, "Cap: 60%"],
        ["MANA_USAGE_REDUCTION", "-45%", -60, "Cap: -60%"],
        ["CRITICAL_CHANCE", "2%", 0, "Cap: 0%"],
    ])(
        "shows the defined cap for %s without changing its calculated value",
        (key, value, cap, label) => {
            render(
                <StatsPanel
                    stats={{ [key]: value }}
                    requestData={{ slots: {} }}
                    gameRules={{ ...gameRules, drifMaxCaps: { [key]: cap } }}
                    onCalculate={vi.fn()}
                />
            );
            const capLabel = screen.getByText(label);
            expect(capLabel).toHaveClass("stat-cap");
            expect(capLabel.closest(".stat-value")).toHaveTextContent(value);
            expect(capLabel.closest("button")).toHaveAccessibleDescription(label);
        }
    );

    it("omits the cap label when a modifier has no defined cap", () => {
        render(
            <StatsPanel
                stats={{ DAMAGE_FIRE: "15%" }}
                gameRules={gameRules}
                onCalculate={vi.fn()}
            />
        );
        expect(screen.queryByText(/^Cap:/)).not.toBeInTheDocument();
    });

    it.each([
        ["pl", "Ilość drifów: 4 · Mnożnik: 0,95", "0,95", "Mnożnik"],
        ["en", "Drif count: 4 · Multiplier: 0.95", "0.95", "Multiplier"],
    ])(
        "shows the equipped drif count and multiplier alongside the stat in %s",
        (language, description, multiplier, heading) => {
            render(
                <LanguageContext.Provider value={{ language, setLanguage: vi.fn() }}>
                    <StatsPanel
                        stats={{ CRITICAL_CHANCE: "55%", DAMAGE_FIRE: "15%" }}
                        gameRules={gameRules}
                        requestData={{
                            slots: Object.fromEntries(
                                ["helmet", "armor", "boots", "weapon"].map((slot) => [
                                    slot,
                                    { itemId: 1, drifIds: [10] },
                                ])
                            ),
                        }}
                        catalog={{ drifs: [{ id: 10, bonusType: "CRITICAL_CHANCE" }] }}
                        onCalculate={vi.fn()}
                    />
                </LanguageContext.Provider>
            );
            const row = screen.getByRole("button", { name: /55%$/ });
            expect(within(row).getByText("4")).toHaveClass("stat-drif-count");
            expect(within(row).getByText(multiplier)).toHaveClass("stat-drif-multiplier");
            expect(row).toHaveAccessibleDescription(description);
            const group = row.closest(".stat-rows");
            expect(within(group).getAllByText(heading)).toHaveLength(1);
            expect(
                within(group).queryByText(/^(Ilość drifów:|Drif count:)/)
            ).not.toBeInTheDocument();
            const otherRow = screen.getByRole("button", { name: /15%$/ });
            expect(within(otherRow).getByText("0")).toHaveClass("stat-drif-count");
            expect(within(otherRow).getByText("1")).toHaveClass("stat-drif-multiplier");
        }
    );

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
