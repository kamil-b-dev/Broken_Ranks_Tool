import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerSettingsPanel from "./OptimizerSettingsPanel";

const settings = {
    forceMaximizationByDrifBonus: false,
    generateVariants: false,
    maxVariantLossPercent: 10,
};

describe("OptimizerSettingsPanel", () => {
    it("publishes each optimizer setting change", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = render(
            <OptimizerSettingsPanel settings={settings} onChange={onChange} />
        );

        const [forceMaximum, variants] = screen.getAllByRole("checkbox");
        const maximumLoss = screen.getByRole("spinbutton");
        expect(maximumLoss).toBeDisabled();

        await user.click(forceMaximum);
        expect(onChange).toHaveBeenLastCalledWith({
            ...settings,
            forceMaximizationByDrifBonus: true,
        });

        await user.click(variants);
        expect(onChange).toHaveBeenLastCalledWith({ ...settings, generateVariants: true });

        const enabledSettings = { ...settings, generateVariants: true };
        rerender(<OptimizerSettingsPanel settings={enabledSettings} onChange={onChange} />);
        fireEvent.change(maximumLoss, { target: { value: "25" } });
        expect(onChange).toHaveBeenLastCalledWith({
            ...enabledSettings,
            maxVariantLossPercent: 25,
        });
    });
});
