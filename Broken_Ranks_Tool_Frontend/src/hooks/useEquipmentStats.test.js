import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateEquipmentStats } from "../api/equipmentApi";
import { useEquipmentStats } from "./useEquipmentStats";

vi.mock("../api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("useEquipmentStats", () => {
    it("stores calculated stats and their display sources", async () => {
        const requestData = { slots: { helmet: { itemId: 1 } } };
        calculateEquipmentStats.mockResolvedValue({
            stats: { hp: 120 },
            drifCategories: { OFFENSIVE: ["CRITICAL_CHANCE"] },
            orbBonusTypes: ["HP"],
        });
        const { result } = renderHook(() => useEquipmentStats(requestData));

        await act(async () => result.current.calculateStats());

        expect(calculateEquipmentStats).toHaveBeenCalledWith(requestData);
        expect(result.current.stats).toEqual({ hp: 120 });
        expect(result.current.statSources).toEqual({
            drifCategories: { OFFENSIVE: ["CRITICAL_CHANCE"] },
            orbBonusTypes: ["HP"],
        });
        expect(result.current.isCalculatingStats).toBe(false);
    });

    it("reports backend errors and can reset a previous result", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
        calculateEquipmentStats
            .mockResolvedValueOnce({ hp: 100 })
            .mockRejectedValueOnce({ response: { data: { message: "Niepoprawny build" } } });
        const { result } = renderHook(() => useEquipmentStats({ slots: {} }));
        await act(async () => result.current.calculateStats());
        act(() => result.current.resetStats());
        expect(result.current.stats).toBeNull();

        await act(async () => result.current.calculateStats());
        expect(alert).toHaveBeenCalledWith("BŁĄD ZAPISU: Niepoprawny build");
        expect(result.current.isCalculatingStats).toBe(false);
    });
});
