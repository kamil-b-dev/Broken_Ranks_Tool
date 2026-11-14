import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BuildRecordTools from "./BuildRecordTools";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
const record = {
    id: "a",
    name: "A",
    payload: {
        format: "broken-ranks-tool-build",
        version: 1,
        build: { requestData: { slots: {}, characterStats: {} }, lockedSlots: [], lockedDrifs: {} },
    },
};
describe("saved build tools", () => {
    it("saves metadata and recalculates a detached saved build", async () => {
        calculateEquipmentStats.mockResolvedValue({ stats: { PŻ: 300 } });
        const library = {
            updateMetadata: vi.fn(),
            updateCalculation: vi.fn(),
            createSnapshot: vi.fn(),
        };
        render(
            <BuildRecordTools
                record={record}
                data={{ items: [], drifs: [], orbs: [] }}
                library={library}
            />
        );
        fireEvent.change(screen.getByLabelText("Notatka"), { target: { value: "Plan" } });
        fireEvent.click(screen.getByText("Zapisz opis"));
        expect(library.updateMetadata).toHaveBeenCalledWith("a", { notes: "Plan", tags: [] });
        await waitFor(() => expect(screen.getByText("Przelicz statystyki")).not.toBeDisabled());
        fireEvent.click(screen.getByText("Przelicz statystyki"));
        await waitFor(() =>
            expect(library.updateCalculation).toHaveBeenCalledWith(
                "a",
                JSON.stringify(record.payload),
                { stats: { PŻ: 300 } }
            )
        );
        expect(calculateEquipmentStats).toHaveBeenCalledWith({ slots: {}, characterStats: {} });
    });
});
