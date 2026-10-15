import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import BackpackEquipmentSelect from "./BackpackEquipmentSelect";

const entries = [
    { id: "available", kind: "DRIF", templateId: "60", level: 6 },
    { id: "blocked", kind: "DRIF", templateId: "60", level: 3 },
    { id: "orb", kind: "ORB", templateId: "50", level: 1 },
];
const setup = (kind = "DRIF") => {
    const onEquip = vi.fn();
    const getWarning = vi.fn((id) => (id === "blocked" ? "Brak pojemności." : null));
    render(
        <BackpackEquipmentSelect
            entries={entries}
            data={builderCatalog}
            kind={kind}
            slotKey="helmet"
            zone="drif-1"
            label="Drif z plecaka"
            onEquip={onEquip}
            getWarning={getWarning}
        />
    );
    return { onEquip, getWarning, select: screen.getByRole("combobox") };
};

describe("backpack stone selector", () => {
    it("shows owned occurrences of the requested kind and explains blocked choices", () => {
        const { select, onEquip, getWarning } = setup();
        expect(screen.getAllByRole("option")).toHaveLength(3);
        expect(screen.getByRole("option", { name: /1\. Band/ })).toBeEnabled();
        expect(screen.getByRole("option", { name: /2\. Band.*Brak pojemności/ })).toBeDisabled();
        expect(screen.queryByRole("option", { name: /Ochrona/ })).not.toBeInTheDocument();
        expect(getWarning).toHaveBeenCalledWith("blocked", "helmet", "drif-1");
        fireEvent.change(select, { target: { value: "available" } });
        expect(onEquip).toHaveBeenCalledExactlyOnceWith("available", "helmet", "drif-1");
        expect(select).toHaveValue("");
        fireEvent.change(select, { target: { value: "" } });
        expect(onEquip).toHaveBeenCalledTimes(1);
    });

    it("shows an empty choice when there are no matching stones", () => {
        const { select, onEquip, getWarning } = setup("ITEM");
        expect(screen.getByRole("option")).toHaveTextContent("Brak kamieni tego rodzaju w plecaku");
        fireEvent.change(select, { target: { value: "" } });
        expect(onEquip).not.toHaveBeenCalled();
        expect(getWarning).not.toHaveBeenCalled();
    });
});
