import { fireEvent, render, screen } from "@testing-library/react";
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

    it("updates target mode, target value, action limit, and analysis budget", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const settings = { advisorGoal: "A" };
        render(
            <AdvisorGoalsPanel
                stats={{ A: "5%", B: "-10%" }}
                gameRules={gameRules}
                settings={settings}
                onChange={onChange}
            />
        );

        await user.selectOptions(screen.getByLabelText("Oczekiwany efekt"), "VALUE");
        expect(onChange).toHaveBeenCalledWith({
            ...settings,
            advisorSearch: expect.objectContaining({ targetMode: "VALUE" }),
        });

        onChange.mockClear();
        await user.selectOptions(screen.getByLabelText("Maksymalna liczba działań w planie"), "3");
        expect(onChange).toHaveBeenCalledWith({
            ...settings,
            advisorSearch: expect.objectContaining({ maxActions: 3 }),
        });

        onChange.mockClear();
        await user.selectOptions(screen.getByLabelText("Dokładność analizy"), "5000");
        expect(onChange).toHaveBeenCalledWith({
            ...settings,
            advisorSearch: expect.objectContaining({ timeBudgetMs: 5000 }),
        });
    });

    it("updates protected modifiers and every allowed change independently", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const settings = { advisorGoal: "A" };
        render(
            <AdvisorGoalsPanel
                stats={{ A: "5%", B: "-10%" }}
                gameRules={gameRules}
                settings={settings}
                onChange={onChange}
            />
        );

        fireEvent.change(screen.getByLabelText("Dopuszczalny spadek: Redukcja many"), {
            target: { value: "2.5" },
        });
        expect(onChange).toHaveBeenLastCalledWith({
            ...settings,
            advisorProtectedModifiers: { B: { enabled: true, loss: "2.5" } },
        });

        onChange.mockClear();
        await user.click(screen.getByRole("checkbox", { name: /Redukcja many/ }));
        expect(onChange).toHaveBeenCalledWith({
            ...settings,
            advisorProtectedModifiers: { B: { enabled: false, loss: 0 } },
        });

        for (const label of [
            "Gwiazdki",
            "Ulepszanie drifów",
            "Zakupy drifów",
            "Zakupy przedmiotów",
        ]) {
            onChange.mockClear();
            await user.click(screen.getByRole("checkbox", { name: label }));
            expect(onChange).toHaveBeenCalledWith({
                ...settings,
                advisorAllowedChanges: expect.any(Object),
            });
        }
    });
});
