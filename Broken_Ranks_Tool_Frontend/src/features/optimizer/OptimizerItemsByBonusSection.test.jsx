import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import OptimizerItemsByBonusSection from "./OptimizerItemsByBonusSection";

describe("OptimizerItemsByBonusSection", () => {
    it("shows an empty-state hint before optimization", () => {
        render(<OptimizerItemsByBonusSection />);

        expect(
            screen.getByText("Mapa przedmiotów pojawi się po optymalizacji.")
        ).toBeInTheDocument();
    });

    it("sorts bonus groups and resolves equipment slot labels", () => {
        render(
            <OptimizerItemsByBonusSection
                itemsByBonus={{
                    0.05: [{ slotKey: "helmet", itemName: "Hełm testowy" }],
                    0.125: [{ slotKey: "custom", itemName: "Przedmiot niestandardowy" }],
                }}
            />
        );

        const bonuses = screen.getAllByText(/^\+.+%$/);
        expect(bonuses.map((element) => element.textContent)).toEqual(["+12,5%", "+5%"]);
        expect(screen.getByText("Hełm")).toBeInTheDocument();
        expect(screen.getByText("custom")).toBeInTheDocument();
    });
});
