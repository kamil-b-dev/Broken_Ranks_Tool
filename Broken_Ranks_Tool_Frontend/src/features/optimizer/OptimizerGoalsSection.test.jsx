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
    it("explains that configured priorities require an optimization run", () => {
        render(<OptimizerGoalsSection currentDetails={[{ key: "a" }, { key: "b" }]} />);

        expect(
            screen.getByText(
                "Uruchom optymalizację, aby kalkulator ocenił 2 wybranych priorytetów."
            )
        ).toBeInTheDocument();
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
