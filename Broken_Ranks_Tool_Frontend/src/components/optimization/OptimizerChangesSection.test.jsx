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
});
