import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerVariantsSection from "./OptimizerVariantsSection";

const variants = [
    { main: true, bonusName: "main", setup: { id: "main" } },
    {
        bonusName: "Szansa na krytyk",
        setup: { id: "alternative" },
        finalValue: 10,
        variantValue: 12.5,
        gain: 2.5,
        totalLoss: 1,
        changeCount: 1,
        score: 1.5,
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
            { statKey: "criticalChance", finalValue: "10%", variantValue: "12,5%" },
            { statKey: "cooldown", finalValue: "-5%", variantValue: "-8%" },
        ],
    },
];

describe("OptimizerVariantsSection", () => {
    it("shows the empty report state", () => {
        render(<OptimizerVariantsSection />);

        expect(
            screen.getByText("Brak ocenionych wariantów poprawiających maksymalizowany mod.")
        ).toBeInTheDocument();
    });

    it("presents variant changes and delegates selection", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <OptimizerVariantsSection
                variants={variants}
                activeIndex={0}
                maxCaps={{ criticalChance: 42, cooldown: -30 }}
                translations={{ criticalChance: "Szansa na krytyk", cooldown: "Redukcja tur" }}
                onSelect={onSelect}
            />
        );

        expect(screen.getByText("Aktywny")).toBeInTheDocument();
        expect(screen.getByText("10% → 12,5%")).toBeInTheDocument();
        expect(screen.getByText(/Hełm testowy/).closest("li")).toHaveTextContent(
            "Hełm testowy (Hełm): puste miejsce → Krytyk (4)"
        );
        const alternative = screen.getByRole("button", { name: /Szansa na krytyk/ });
        expect(within(alternative).getByText("Redukcja tur")).toBeInTheDocument();
        await user.click(alternative);

        expect(onSelect).toHaveBeenCalledWith(variants[1], 1);
    });
});
