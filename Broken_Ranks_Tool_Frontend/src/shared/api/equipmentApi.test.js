import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./axiosConfig";
import {
    calculateEquipmentStats,
    cancelAdvisorOptimization,
    fetchInitialEquipmentData,
    optimizeEquipmentDrifs,
} from "./equipmentApi";

vi.mock("./axiosConfig", () => ({
    default: { get: vi.fn(), post: vi.fn() },
}));

describe("equipmentApi", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns response data from every public API endpoint", async () => {
        apiClient.get.mockResolvedValueOnce({ data: { items: [] } });
        apiClient.post
            .mockResolvedValueOnce({ data: { stats: { hp: 10 } } })
            .mockResolvedValueOnce({ data: { summary: { success: true } } })
            .mockResolvedValueOnce({ data: { cancelled: true } });

        await expect(fetchInitialEquipmentData()).resolves.toEqual({ items: [] });
        await expect(calculateEquipmentStats({ slots: {} })).resolves.toEqual({
            stats: { hp: 10 },
        });
        await expect(optimizeEquipmentDrifs({ priorities: {} })).resolves.toEqual({
            summary: { success: true },
        });
        await expect(cancelAdvisorOptimization("run id/1")).resolves.toEqual({
            cancelled: true,
        });

        expect(apiClient.get).toHaveBeenCalledWith("/initial-data");
        expect(apiClient.post).toHaveBeenNthCalledWith(1, "/calculator/calculate", { slots: {} });
        expect(apiClient.post).toHaveBeenNthCalledWith(2, "/optimizer/drifs", {
            priorities: {},
        });
        expect(apiClient.post).toHaveBeenNthCalledWith(3, "/optimizer/advisor/run%20id%2F1/cancel");
    });
});
