import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AdvisorGoalsPanel from "./AdvisorGoalsPanel";

const gameRules = {
    bonusTranslations: { A: "Mod A", B: "Redukcja many" },
    drifBasePowers: { A: 4, B: 2 },
};
describe("AdvisorGoalsPanel", () => {
    it("offers a zero-valued goal and separate permission for buying drifs", async () => {
        const onChange = vi.fn();
        render(
            <AdvisorGoalsPanel
                stats={{ B: "-10%" }}
                gameRules={gameRules}
                settings={{}}
                onChange={onChange}
            />
        );
        expect(screen.getByRole("option", { name: /Mod A.*0%/ })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "Zakupy drifów" })).not.toBeChecked();
        await userEvent.selectOptions(screen.getByLabelText("Główny cel"), "A");
        expect(onChange).toHaveBeenCalledWith({ advisorGoal: "A" });
    });
    it("shows explicit target units and signed protected reductions", () => {
        render(
            <AdvisorGoalsPanel
                stats={{ B: "-10%" }}
                gameRules={gameRules}
                settings={{ advisorGoal: "A", advisorSearch: { targetMode: "GAIN", target: 2 } }}
                onChange={vi.fn()}
            />
        );
        expect(screen.getByLabelText("Przyrost (p.p.)")).toHaveValue(2);
        expect(screen.getByText("-10%")).toBeInTheDocument();
        expect(screen.getByLabelText("Dopuszczalny spadek: Redukcja many")).toHaveValue(0);
    });
});
