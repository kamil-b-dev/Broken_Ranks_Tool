import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import OptimizerLabelSettings from "./OptimizerLabelSettings";
import { OptimizerLabelContext } from "./optimizerLabelContext";
import { OPTIMIZER_LABEL_STORAGE_KEY } from "./optimizerLabels";
import { useOptimizerLabels } from "./useOptimizerLabels";

const Settings = () => {
    const labels = useOptimizerLabels(
        { bonusTranslations: { DAMAGE_MAGIC: "Obrażenia magiczne" } },
        [{ name: "Abaf", bonusType: "DAMAGE_MAGIC" }]
    );
    return (
        <OptimizerLabelContext.Provider value={labels}>
            <OptimizerLabelSettings />
            <output>{labels.getName("DAMAGE_MAGIC")}</output>
        </OptimizerLabelContext.Provider>
    );
};

describe("optimizer naming settings", () => {
    beforeEach(() => localStorage.clear());
    it("changes displayed names in both directions and restores the saved choice", () => {
        const first = render(<Settings />);
        const select = screen.getByRole("combobox", { name: "Nazwy modów" });
        expect(select).toHaveValue("MODIFIERS");
        expect(screen.getByRole("status")).toHaveTextContent("Obrażenia magiczne");
        fireEvent.change(select, { target: { value: "DRIFS" } });
        expect(screen.getByRole("status")).toHaveTextContent("Abaf");
        expect(localStorage.getItem(OPTIMIZER_LABEL_STORAGE_KEY)).toBe("DRIFS");
        first.unmount();
        render(<Settings />);
        expect(screen.getByRole("combobox", { name: "Nazwy modów" })).toHaveValue("DRIFS");
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "MODIFIERS" } });
        expect(screen.getByRole("status")).toHaveTextContent("Obrażenia magiczne");
        expect(localStorage.getItem(OPTIMIZER_LABEL_STORAGE_KEY)).toBe("MODIFIERS");
    });
});
