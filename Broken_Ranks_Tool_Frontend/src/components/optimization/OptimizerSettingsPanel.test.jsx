import { render, screen } from "@testing-library/react";
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
});
