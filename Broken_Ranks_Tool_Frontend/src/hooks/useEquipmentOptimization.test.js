import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizeEquipmentDrifs } from "../api/equipmentApi";
import { useEquipmentOptimization } from "./useEquipmentOptimization";

vi.mock("../api/equipmentApi", () => ({ optimizeEquipmentDrifs: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

const renderOptimization = (slots = {}) => {
    const setRequestData = vi.fn();
    const hook = renderHook(() =>
        useEquipmentOptimization({
            slots,
            setRequestData,
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        })
    );
    return { ...hook, setRequestData };
};

describe("useEquipmentOptimization", () => {
    it("rejects optimization without an equipped item", async () => {
        const { result } = renderOptimization({ helmet: { itemId: null } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({});
        });

        expect(response).toMatchObject({ success: false, applied: false });
        expect(optimizeEquipmentDrifs).not.toHaveBeenCalled();
    });

    it("sends locks, applies the optimized setup, and signals a refresh", async () => {
        const optimizedSetup = { slots: { helmet: { itemId: 9 } } };
        optimizeEquipmentDrifs.mockResolvedValue({
            optimizedSetup,
            summary: { success: true },
        });
        const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({ priorities: { TEST: 10 } });
        });

        expect(optimizeEquipmentDrifs).toHaveBeenCalledWith(
            expect.objectContaining({
                originalSlots: { helmet: { itemId: 7 } },
                lockedSlots: ["helmet"],
                lockedDrifs: { helmet: [0] },
            })
        );
        expect(response).toEqual({ success: true, applied: true });
        expect(setRequestData).toHaveBeenCalledWith(expect.any(Function));
        expect(result.current.optimizationTrigger).toBe(1);
    });

    it("normalizes optimizer timeout failures", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        optimizeEquipmentDrifs.mockRejectedValue({ code: "ECONNABORTED" });
        const { result } = renderOptimization({ helmet: { itemId: 7 } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({});
        });

        expect(response).toEqual({
            success: false,
            message: "Przekroczono limit czasu optymalizacji.",
            applied: false,
        });
    });
});
