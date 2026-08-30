import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StandardDrifSlot from "./StandardDrifSlot";

const drifs = [
    { id: 1, name: "Krytyk", bonusType: "CRITICAL", size: "SUBDRIF" },
    { id: 2, name: "Krytyk", bonusType: "CRITICAL", size: "BIDRIF" },
];

const Harness = ({ locked = false, onToggleLock = vi.fn() }) => {
    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});
    return (
        <StandardDrifSlot
            index={0}
            drifs={drifs}
            selectedDrifs={selectedDrifs}
            drifTypes={drifTypes}
            drifLevels={drifLevels}
            maxDrifIndex={1}
            bonusTranslations={{ CRITICAL: "Szansa na krytyk" }}
            drifBasePowers={{ CRITICAL: 3 }}
            groupByType={(options) => ({ Krytyk: options })}
            locked={locked}
            parentLocked={false}
            showLock
            overCapacity={false}
            dragActive={false}
            onDragOver={vi.fn()}
            onDragLeave={vi.fn()}
            onDrop={vi.fn()}
            onToggleLock={onToggleLock}
            setSelectedDrifs={setSelectedDrifs}
            setDrifTypes={setDrifTypes}
            setDrifLevels={setDrifLevels}
        />
    );
};

describe("StandardDrifSlot", () => {
    it("selects a type, size, and level in sequence", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.selectOptions(screen.getByLabelText("Wybierz rodzaj drifa 1"), "Krytyk");
        await user.selectOptions(screen.getByLabelText("Wybierz wielkość drifa 1"), "2");
        await user.selectOptions(screen.getByLabelText("Wybierz poziom drifa 1"), "5");

        expect(screen.getByLabelText("Wybierz wielkość drifa 1")).toHaveValue("2");
        expect(screen.getByLabelText("Wybierz poziom drifa 1")).toHaveValue("5");
        expect(screen.getByTitle("Zablokuj drif w optymalizatorze")).toBeEnabled();
    });

    it("disables editing when the drif is locked", () => {
        render(<Harness locked />);
        expect(screen.getByLabelText("Wybierz rodzaj drifa 1")).toBeDisabled();
    });
});
