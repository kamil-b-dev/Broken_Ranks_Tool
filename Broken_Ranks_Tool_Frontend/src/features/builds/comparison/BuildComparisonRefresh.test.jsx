import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BuildComparisonRefresh from "./BuildComparisonRefresh";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
describe("comparison recalculation", () => {
    it("updates selected saved builds sequentially and leaves editor state alone", async () => {
        calculateEquipmentStats.mockResolvedValue({ stats: { PŻ: 200 } });
        const payload = {
            format: "broken-ranks-tool-build",
            version: 1,
            build: {
                requestData: { slots: {}, characterStats: {} },
                lockedSlots: [],
                lockedDrifs: {},
            },
        };
        const builds = [
            { id: "a", payload },
            { id: "b", payload },
        ];
        const library = { updateCalculation: vi.fn().mockResolvedValue(true) };
        render(
            <BuildComparisonRefresh
                builds={builds}
                library={library}
                data={{ items: [], drifs: [], orbs: [] }}
            />
        );
        fireEvent.click(screen.getByText("Przelicz wybrane buildy"));
        await waitFor(() => expect(library.updateCalculation).toHaveBeenCalledTimes(2));
        expect(calculateEquipmentStats).toHaveBeenCalledTimes(2);
        expect(builds.every((record) => record.stats == null)).toBe(true);
    });
});
