import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StandardDrifSlot from "./StandardDrifSlot";

const drifs = [
    { id: 1, name: "Krytyk", bonusType: "CRITICAL", size: "SUBDRIF" },
    { id: 2, name: "Krytyk", bonusType: "CRITICAL", size: "BIDRIF" },
    { id: 3, name: "Ogień", bonusType: "DAMAGE_FIRE", size: "SUBDRIF" },
    { id: 4, name: "Mróz", bonusType: "DAMAGE_FROST", size: "SUBDRIF" },
];

const groupByName = (options) =>
    options.reduce((groups, option) => {
        const next = groups;
        next[option.name] = [...(next[option.name] || []), option];
        return next;
    }, {});

const Harness = ({
    locked = false,
    onToggleLock = vi.fn(),
    index = 0,
    slotKey = "weapon",
    initialSelectedDrifs = [],
}) => {
    const [selectedDrifs, setSelectedDrifs] = useState(initialSelectedDrifs);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});
    return (
        <StandardDrifSlot
            index={index}
            slotKey={slotKey}
            drifs={drifs}
            elementalTypes={["DAMAGE_FIRE", "DAMAGE_FROST"]}
            selectedDrifs={selectedDrifs}
            drifTypes={drifTypes}
            drifLevels={drifLevels}
            maxDrifIndex={1}
            bonusTranslations={{ CRITICAL: "Szansa na krytyk" }}
            drifBasePowers={{ CRITICAL: 3 }}
            groupByType={groupByName}
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

    it("offers elemental drifs only in an otherwise elemental-free weapon", () => {
        const { rerender } = render(<Harness slotKey="helmet" />);
        expect(screen.queryByRole("option", { name: "Ogień" })).not.toBeInTheDocument();

        rerender(<Harness key="empty-weapon" />);
        expect(screen.getByRole("option", { name: "Ogień" })).toBeInTheDocument();

        rerender(<Harness key="weapon" index={1} initialSelectedDrifs={["3", ""]} />);
        expect(screen.queryByRole("option", { name: "Mróz" })).not.toBeInTheDocument();
    });
});
