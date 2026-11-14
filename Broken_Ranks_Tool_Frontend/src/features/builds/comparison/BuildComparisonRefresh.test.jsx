import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuildComparisonRefresh from "./BuildComparisonRefresh";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
vi.mock("../../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
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

const payload = {
    format: "broken-ranks-tool-build",
    version: 1,
    build: { requestData: { slots: {}, characterStats: {} }, lockedSlots: [], lockedDrifs: {} },
};
it("reports when a recalculation cannot be saved", async () => {
    calculateEquipmentStats.mockResolvedValue({ stats: { PŻ: 200 } });
    render(
        <BuildComparisonRefresh
            builds={[{ id: "a", payload }]}
            library={{ updateCalculation: vi.fn().mockResolvedValue(false) }}
            data={{ items: [], drifs: [], orbs: [] }}
        />
    );
    fireEvent.click(screen.getByText("Przelicz wybrane buildy"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie zapisano przeliczenia");
});

it("cancels a pending comparison when the selection changes", async () => {
    let resolve;
    calculateEquipmentStats.mockImplementation(
        () =>
            new Promise((done) => {
                resolve = done;
            })
    );
    const data = { items: [], drifs: [], orbs: [] },
        library = { updateCalculation: vi.fn() };
    const view = render(
        <BuildComparisonRefresh builds={[{ id: "a", payload }]} library={library} data={data} />
    );
    fireEvent.click(screen.getByText("Przelicz wybrane buildy"));
    const signal = calculateEquipmentStats.mock.calls[0][1].signal;
    view.rerender(<BuildComparisonRefresh builds={[]} library={library} data={data} />);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve({ stats: { PŻ: 200 } }));
    expect(library.updateCalculation).not.toHaveBeenCalled();
});
