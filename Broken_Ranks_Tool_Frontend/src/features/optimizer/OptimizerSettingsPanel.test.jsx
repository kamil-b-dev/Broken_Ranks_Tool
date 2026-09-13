import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerSettingsPanel, { OptimizerModeNavigation } from "./OptimizerSettingsPanel";

const settings = {
    forceMaximizationByDrifBonus: true,
    generateVariants: true,
    maxVariantLossPercent: 5,
};

describe("OptimizerSettingsPanel", () => {
    it("offers only the optimizer and advisor modes", () => {
        render(
            <OptimizerModeNavigation
                settings={{ ...settings, mode: "BUILD_FROM_SCRATCH" }}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText("Od zera")).toBeInTheDocument();
        expect(screen.getByText("Doradca")).toBeInTheDocument();
        expect(screen.queryByText("Reorganizacja")).not.toBeInTheDocument();
    });

    it("shows build-from-scratch controls only in that workspace", () => {
        render(
            <OptimizerSettingsPanel
                settings={{ ...settings, mode: "BUILD_FROM_SCRATCH" }}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText("Ustawienia budowania")).toBeInTheDocument();
        expect(screen.getByText(/Wymuś maksymalizację/)).toBeInTheDocument();
    });

    it("uses recommendation-specific options in advisor workspace", () => {
        render(
            <OptimizerSettingsPanel
                settings={{ ...settings, mode: "ADVISOR" }}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText("Zakres rekomendacji")).toBeInTheDocument();
        expect(screen.queryByText("Maksymalna strata:")).not.toBeInTheDocument();
        expect(screen.queryByText(/Wymuś maksymalizację/)).not.toBeInTheDocument();
    });

    it("updates build settings from every control", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <OptimizerSettingsPanel
                settings={{ ...settings, mode: "BUILD_FROM_SCRATCH" }}
                onChange={onChange}
            />
        );

        await user.click(screen.getByText(/Wymuś maksymalizację/));
        await user.click(screen.getByText("Obliczaj dodatkowe warianty"));
        fireEvent.change(
            screen.getByRole("spinbutton", {
                name: "Maksymalna dopuszczalna strata wariantu w procentach",
            }),
            { target: { value: "17" } }
        );

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ forceMaximizationByDrifBonus: false })
        );
        expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ generateVariants: false }));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ maxVariantLossPercent: 17 })
        );
    });

    it("updates advisor profession and mode navigation", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const advisorSettings = { ...settings, mode: "ADVISOR", advisorProfession: "AUTO" };
        const { rerender } = render(
            <OptimizerSettingsPanel settings={advisorSettings} onChange={onChange} />
        );

        await user.selectOptions(
            screen.getByRole("combobox", { name: /Profil buildu/i }),
            "PHYSICAL"
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ advisorProfession: "PHYSICAL" })
        );

        rerender(<OptimizerModeNavigation settings={advisorSettings} onChange={onChange} />);
        await user.click(screen.getByRole("button", { name: /Od zera/i }));
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ mode: "BUILD_FROM_SCRATCH" })
        );
    });
});
