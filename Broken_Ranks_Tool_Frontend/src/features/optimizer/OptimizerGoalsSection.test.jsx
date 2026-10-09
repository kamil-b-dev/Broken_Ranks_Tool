import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerGoalsSection from "./OptimizerGoalsSection";

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
