import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerGoalsSection from "./OptimizerGoalsSection";
import { OptimizerLabelContext } from "./optimizerLabelContext";
import { createOptimizerLabels } from "./optimizerLabels";

const goal = {
    statKey: "criticalChance",
    bonusName: "Szansa na krytyk",
    priority: 1,
    placedCount: 2,
    minimumCount: 2,
    maximumCount: 4,
    targetLabel: "10%",
    calculatorValue: "8%",
};

describe("OptimizerGoalsSection", () => {
    it("renames a missed goal while keeping its values, counts and satisfaction state", () => {
        const original = structuredClone(goal);
        const view = (mode) => (
            <OptimizerLabelContext.Provider
                value={createOptimizerLabels(
                    { bonusTranslations: { criticalChance: "Szansa na krytyk" } },
                    [{ name: "Band", bonusType: "criticalChance" }],
                    mode
                )}
            >
                <OptimizerGoalsSection
                    goals={[goal]}
                    currentDetails={[]}
                    activeVariant={{
                        main: false,
                        calculationResult: { stats: { criticalChance: "8%" } },
                    }}
                />
            </OptimizerLabelContext.Provider>
        );
        const rendered = render(view("DRIFS"));
        expect(screen.getByRole("status")).toHaveTextContent("Band: 8% (cel 10%)");
        expect(screen.getByText("2 / 2–4")).toBeInTheDocument();
        expect(screen.getByText("Częściowo")).toBeInTheDocument();
        rendered.rerender(view("MODIFIERS"));
        expect(screen.getByRole("status")).toHaveTextContent("Szansa na krytyk: 8% (cel 10%)");
        expect(screen.getByText("Częściowo")).toBeInTheDocument();
        expect(goal).toEqual(original);
    });
    it("warns that a selected tradeoff misses a goal met by the main build", () => {
        render(
            <OptimizerGoalsSection
                goals={[
                    { ...goal, targetLabel: "40%", calculatorValue: "40%", targetSatisfied: true },
                ]}
                currentDetails={[]}
                activeVariant={{
                    main: false,
                    calculationResult: { stats: { criticalChance: "39%" } },
                }}
            />
        );
        expect(screen.getByRole("status")).toHaveTextContent("Szansa na krytyk: 39% (cel 40%)");
        expect(screen.getByText("Częściowo")).toBeInTheDocument();
    });

    it("does not warn or reject a surplus when another modifier is improved", () => {
        render(
            <OptimizerGoalsSection
                goals={[{ ...goal, targetLabel: "60%", calculatorValue: "62%" }]}
                currentDetails={[]}
                activeVariant={{
                    main: false,
                    calculationResult: {
                        stats: { criticalChance: "70%", DAMAGE_PHYSICAL: "110%" },
                    },
                }}
            />
        );
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText("70%")).toBeInTheDocument();
        expect(screen.getByText("Osiągnięty")).toBeInTheDocument();
    });
    it("respects the backend decision for a main goal within its percentage tolerance", () => {
        render(
            <OptimizerGoalsSection
                goals={[{ ...goal, calculatorValue: "9,8%", targetSatisfied: true }]}
                currentDetails={[]}
            />
        );
        expect(screen.getByText("Osiągnięty")).toBeInTheDocument();
    });

    it.each([
        [false, "Osiągnięty"],
        [true, "Częściowo"],
    ])("uses the correct tolerance for a variant in advisor=%s", (advisory, label) => {
        render(
            <OptimizerGoalsSection
                goals={[goal]}
                currentDetails={[]}
                activeVariant={{
                    main: false,
                    calculationResult: { stats: { criticalChance: "9,8%" } },
                }}
                advisory={advisory}
            />
        );
        expect(screen.getByText(label)).toBeInTheDocument();
    });
    it("does not add placeholder copy without optimization results", () => {
        const { container } = render(
            <OptimizerGoalsSection currentDetails={[{ key: "a" }, { key: "b" }]} />
        );

        expect(container.querySelector(".optimizer-goals-list")).not.toBeInTheDocument();
    });

    it("uses the selected variant when evaluating a completed goal", () => {
        render(
            <OptimizerGoalsSection
                goals={[goal]}
                currentDetails={[{ key: goal.statKey, count: 3, penaltyPercent: 0 }]}
                activeVariant={{
                    statChanges: [{ statKey: goal.statKey, variantValue: "12%" }],
                }}
                maxCaps={{ criticalChance: 42 }}
            />
        );

        expect(screen.getByText("Osiągnięty")).toBeInTheDocument();
        expect(screen.getByText("3 / 2–4")).toBeInTheDocument();
        expect(screen.getByText("Bez kary")).toBeInTheDocument();
    });

    it("evaluates negative-cap goals in the inverse direction", () => {
        render(
            <OptimizerGoalsSection
                goals={[{ ...goal, statKey: "cooldown", calculatorValue: "-12%" }]}
                currentDetails={[]}
                maxCaps={{ cooldown: -30 }}
            />
        );

        expect(screen.getByText("Osiągnięty")).toBeInTheDocument();
    });
});
