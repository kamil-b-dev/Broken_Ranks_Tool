import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerChangesSection from "./OptimizerChangesSection";

describe("OptimizerChangesSection", () => {
    it("summarizes placement and calculator changes for the selected variant", () => {
        render(
            <OptimizerChangesSection
                variant={{
                    changes: [
                        {
                            slotKey: "helmet",
                            itemName: "Hełm testowy",
                            fromModifier: null,
                            toModifier: "Krytyk",
                            toLevel: 4,
                        },
                    ],
                    statChanges: [
                        {
                            statKey: "criticalChance",
                            finalValue: "10%",
                            variantValue: "12,5%",
                        },
                    ],
                }}
                maxCaps={{ criticalChance: 42 }}
                translations={{ criticalChance: "Szansa na krytyk" }}
            />
        );

        expect(screen.getByText("Hełm testowy")).toBeInTheDocument();
        expect(screen.getByText("Puste miejsce")).toBeInTheDocument();
        expect(screen.getByText("Krytyk 4")).toBeInTheDocument();
        expect(screen.getByText(/Szansa na krytyk/)).toHaveTextContent("10% → 12,5%");
    });

    it("prefers advisor actions and hides unchanged calculator values", () => {
        render(
            <OptimizerChangesSection
                advisory
                variant={{
                    advisorActions: ["Kup nowy drif", "Przenieś drif do hełmu"],
                    changes: [{ slotKey: "helmet", itemName: "Hełm" }],
                    statChanges: [
                        { statKey: "same", finalValue: "10%", variantValue: "10%" },
                        { statKey: "mana", finalValue: "-10%", variantValue: "-15%" },
                    ],
                }}
                maxCaps={{ mana: -60 }}
                translations={{ same: "Bez zmiany", mana: "Zużycie many" }}
            />
        );

        expect(screen.getByRole("list", { name: "Plan zmian" })).toHaveTextContent("Kup nowy drif");
        expect(screen.queryByText("Hełm")).not.toBeInTheDocument();
        expect(screen.queryByText(/Bez zmiany/)).not.toBeInTheDocument();
        expect(screen.getByText(/Zużycie many/)).toHaveClass("is-positive");
    });

    it("shows a prompt when no alternative is selected", () => {
        render(<OptimizerChangesSection variant={null} />);
        expect(screen.getByText(/Wybierz wariant alternatywny/)).toBeInTheDocument();
    });
});
