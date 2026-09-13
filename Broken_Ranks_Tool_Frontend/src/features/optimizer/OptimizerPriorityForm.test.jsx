import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerPriorityForm from "./OptimizerPriorityForm";

const bonus = {
    value: "Szansa na krytyk",
    weight: 10,
    min: 1,
    max: 5,
    forceCap: false,
    forcePercentage: false,
    forcedPercentage: 12.5,
    maximize: false,
};

describe("OptimizerPriorityForm", () => {
    it("delegates numeric target changes", () => {
        const onChange = vi.fn();
        render(<OptimizerPriorityForm bonus={bonus} maxCap={42} onChange={onChange} />);

        fireEvent.change(screen.getByRole("slider"), { target: { value: "18" } });
        const numberInputs = screen.getAllByRole("spinbutton");
        fireEvent.change(numberInputs[0], { target: { value: "2" } });
        fireEvent.change(numberInputs[1], { target: { value: "7" } });

        expect(onChange).toHaveBeenCalledWith("weight", "18");
        expect(onChange).toHaveBeenCalledWith("min", "2");
        expect(onChange).toHaveBeenCalledWith("max", "7");
    });

    it("delegates cap, percentage and maximization choices", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<OptimizerPriorityForm bonus={bonus} maxCap={42} onChange={onChange} />);

        expect(screen.getByLabelText("Wymuszony procent dla Szansa na krytyk")).toBeDisabled();
        await user.click(screen.getByLabelText("Dąż do capa dla Szansa na krytyk"));
        await user.click(screen.getByLabelText("Wymuś konkretny procent dla Szansa na krytyk"));
        await user.click(
            screen.getByTitle(
                "Maksymalizuj wartość moda, wykorzystując najpierw przedmioty z najwyższym bonusem do drifów"
            )
        );

        expect(onChange).toHaveBeenCalledWith("forceCap", true);
        expect(onChange).toHaveBeenCalledWith("forcePercentage", true);
        expect(onChange).toHaveBeenCalledWith("maximize", true);
    });

    it("shows the potential range and missing-cap state", () => {
        render(
            <OptimizerPriorityForm
                bonus={bonus}
                potential={{ potentialMinimum: 3.25, potentialMaximum: 8.5 }}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText("3,25%–8,5%")).toBeInTheDocument();
        expect(screen.getByText("Brak limitu")).toBeInTheDocument();
    });
});
