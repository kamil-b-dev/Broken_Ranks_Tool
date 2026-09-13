import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOptimizationRun } from "./useOptimizationRun";

afterEach(() => vi.restoreAllMocks());

describe("useOptimizationRun", () => {
    it("stores the result, duration, and resets the active variant", async () => {
        const resultPayload = { success: true, message: "Gotowe" };
        const runOptimization = vi.fn().mockResolvedValue(resultPayload);
        const now = vi.fn().mockReturnValueOnce(1000).mockReturnValueOnce(3600);
        const { result } = renderHook(() => useOptimizationRun(runOptimization, now));
        act(() => result.current.setActiveVariantIndex(2));

        await act(async () => {
            await result.current.run({ priorities: ["CRITICAL_CHANCE"] });
        });

        expect(runOptimization).toHaveBeenCalledWith({ priorities: ["CRITICAL_CHANCE"] });
        expect(result.current.status).toEqual(resultPayload);
        expect(result.current.activeVariantIndex).toBe(0);
        expect(result.current.elapsedSeconds).toBe(2);
        expect(result.current.lastDurationSeconds).toBe(2);
        expect(result.current.isOptimizing).toBe(false);
    });

    it("leaves the running state after a backend failure", async () => {
        const runOptimization = vi.fn().mockRejectedValue(new Error("backend unavailable"));
        const now = vi.fn().mockReturnValue(1000);
        const { result } = renderHook(() => useOptimizationRun(runOptimization, now));

        let rejection;
        await act(async () => {
            try {
                await result.current.run({});
            } catch (error) {
                rejection = error;
            }
        });
        expect(rejection).toEqual(new Error("backend unavailable"));
        expect(result.current.isOptimizing).toBe(false);
        expect(result.current.lastDurationSeconds).toBe(0);
    });
});
