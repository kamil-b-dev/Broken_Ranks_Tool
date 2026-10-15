import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerVariantsSection from "./OptimizerVariantsSection";
import { OptimizerLabelContext } from "./optimizerLabelContext";
import { createOptimizerLabels } from "./optimizerLabels";

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
    it("changes display names while selecting and applying the original variant object", async () => {
        const user = userEvent.setup();
        const original = structuredClone(variants);
        const onSelect = vi.fn();
        const onApply = vi.fn();
        const rules = { bonusTranslations: { criticalChance: "Szansa na krytyk" } };
        const drifs = [{ name: "Band", bonusType: "criticalChance" }];
        const view = (mode) => (
            <OptimizerLabelContext.Provider value={createOptimizerLabels(rules, drifs, mode)}>
                <OptimizerVariantsSection
                    variants={variants}
                    activeIndex={1}
                    onSelect={onSelect}
                    onApply={onApply}
                />
            </OptimizerLabelContext.Provider>
        );
        const rendered = render(view("DRIFS"));
        await user.click(screen.getByRole("button", { name: /Band/ }));
        await user.click(screen.getByRole("button", { name: "Zastosuj wybrany wariant" }));
        expect(onSelect).toHaveBeenCalledWith(variants[1], 1);
        expect(onApply).toHaveBeenCalledWith(variants[1], 1);
        expect(onApply.mock.calls[0][0]).toBe(variants[1]);
        rendered.rerender(view("MODIFIERS"));
        expect(screen.getByRole("button", { name: /Szansa na krytyk/ })).toBeInTheDocument();
        expect(variants).toEqual(original);
    });
    it("does not add placeholder copy when variants are unavailable", () => {
        const { container } = render(<OptimizerVariantsSection />);

        expect(container.querySelector(".optimizer-variant-list")).not.toBeInTheDocument();
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

        expect(screen.getByText("Wybrany")).toBeInTheDocument();
        expect(
            screen.getByText(
                (_content, element) =>
                    element.tagName === "STRONG" && element.textContent === "10% → 12,5%"
            )
        ).toBeInTheDocument();
        const alternative = screen.getByRole("button", { name: /Szansa na krytyk/ });
        await user.click(alternative);

        expect(onSelect).toHaveBeenCalledWith(variants[1], 1);
    });
});
