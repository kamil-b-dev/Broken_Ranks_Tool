import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateEquipmentStats } from "../../shared/api/equipmentApi";
import { useEquipmentStats } from "./useEquipmentStats";

vi.mock("../../shared/api/equipmentApi", () => ({ calculateEquipmentStats: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("useEquipmentStats", () => {
    it("keeps an imported calculation through state installation and rejects it after another edit", async () => {
        let finish;
        calculateEquipmentStats.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        const original = { slots: {} };
        const imported = { slots: { helmet: { itemId: 7 } } };
        const { result, rerender } = renderHook(({ request }) => useEquipmentStats(request), {
            initialProps: { request: original },
        });
        let pending;
        act(() => {
            pending = result.current.calculateStatsFor(imported);
        });
        rerender({ request: imported });
        expect(result.current.isCalculatingStats).toBe(true);
        rerender({ request: original });
        await act(async () => {
            finish({ stats: { Atak: 999 } });
            await pending;
        });
        expect(result.current.stats).toBeNull();
        expect(result.current.isCalculatingStats).toBe(false);
    });
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
        calculateEquipmentStats
            .mockResolvedValueOnce({ hp: 100 })
            .mockRejectedValueOnce({ response: { data: { message: "Niepoprawny build" } } });
        const { result } = renderHook(() => useEquipmentStats({ slots: {} }));
        await act(async () => result.current.calculateStats());
        act(() => result.current.resetStats());
        expect(result.current.stats).toBeNull();

        await act(async () => result.current.calculateStats());
        expect(result.current.calculationNotice).toEqual({
            type: "error",
            message: "Błąd obliczeń: Niepoprawny build",
        });
        act(() => result.current.dismissCalculationNotice());
        expect(result.current.calculationNotice).toBeNull();
        expect(result.current.isCalculatingStats).toBe(false);
    });

    it("hides stale results after an edit and restores stats for a loaded snapshot", async () => {
        calculateEquipmentStats.mockResolvedValue({ stats: { Atak: 150 } });
        const initialRequest = { slots: { helmet: { itemId: 1 } } };
        const { result, rerender } = renderHook(
            ({ requestData }) => useEquipmentStats(requestData),
            { initialProps: { requestData: initialRequest } }
        );

        await act(async () => result.current.calculateStats());
        expect(result.current.stats).toEqual({ Atak: 150 });

        const changedRequest = { slots: { helmet: { itemId: 2 } } };
        rerender({ requestData: changedRequest });
        expect(result.current.stats).toBeNull();

        act(() => result.current.restoreStats({ Atak: 170 }, {}, changedRequest));
        expect(result.current.stats).toEqual({ Atak: 170 });
    });

    it("keeps the newest result when overlapping calculations finish out of order", async () => {
        const finishes = [];
        calculateEquipmentStats.mockImplementation(
            () => new Promise((resolve) => finishes.push(resolve))
        );
        const { result } = renderHook(() => useEquipmentStats({ slots: {} }));
        let first;
        let second;

        act(() => {
            first = result.current.calculateStats();
            second = result.current.calculateStats();
        });
        await act(async () => {
            finishes[1]({ stats: { Atak: 200 } });
            await second;
        });
        expect(result.current.stats).toEqual({ Atak: 200 });
        expect(result.current.isCalculatingStats).toBe(false);

        await act(async () => {
            finishes[0]({ stats: { Atak: 100 } });
            await first;
        });
        expect(result.current.stats).toEqual({ Atak: 200 });
    });

    it("ignores a stale failure after a newer calculation succeeds", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const finishes = [];
        calculateEquipmentStats.mockImplementation(
            () => new Promise((resolve, reject) => finishes.push({ resolve, reject }))
        );
        const { result } = renderHook(() => useEquipmentStats({ slots: {} }));
        let first;
        let second;

        act(() => {
            first = result.current.calculateStats();
            second = result.current.calculateStats();
        });
        await act(async () => {
            finishes[1].resolve({ stats: { Atak: 200 } });
            await second;
        });
        await act(async () => {
            finishes[0].reject(new Error("stary błąd"));
            await first;
        });

        expect(result.current.stats).toEqual({ Atak: 200 });
        expect(result.current.calculationNotice).toBeNull();
    });
    it.each(["restore", "reset"])(
        "invalidates a pending calculation on %s and clears progress",
        async (operation) => {
            let finish;
            calculateEquipmentStats.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        finish = resolve;
                    })
            );
            const request = { slots: {} };
            const { result } = renderHook(() => useEquipmentStats(request));
            let pending;
            act(() => {
                pending = result.current.calculateStats();
            });
            expect(result.current.isCalculatingStats).toBe(true);
            act(() =>
                operation === "restore"
                    ? result.current.restoreStats({ Atak: 200 }, {}, request)
                    : result.current.resetStats()
            );
            expect(result.current.isCalculatingStats).toBe(false);
            await act(async () => {
                finish({ stats: { Atak: 100 } });
                await pending;
            });
            expect(result.current.stats).toEqual(operation === "restore" ? { Atak: 200 } : null);
        }
    );

    it("ignores pending failures after restoring a snapshot", async () => {
        let fail;
        calculateEquipmentStats.mockImplementation(
            () =>
                new Promise((_, reject) => {
                    fail = reject;
                })
        );
        const request = { slots: {} };
        const { result } = renderHook(() => useEquipmentStats(request));
        let pending;
        act(() => {
            pending = result.current.calculateStats();
        });
        act(() => result.current.restoreStats({ Atak: 200 }, {}, request));
        await act(async () => {
            fail(new Error("stary błąd"));
            await pending;
        });
        expect(result.current.calculationNotice).toBeNull();
        expect(result.current.stats).toEqual({ Atak: 200 });
    });
    it("invalidates pending errors when the input build changes", async () => {
        let fail;
        calculateEquipmentStats.mockImplementation(
            () =>
                new Promise((_, reject) => {
                    fail = reject;
                })
        );
        const { result, rerender } = renderHook(({ request }) => useEquipmentStats(request), {
            initialProps: { request: { slots: {} } },
        });
        let pending;
        act(() => {
            pending = result.current.calculateStats();
        });
        rerender({ request: { slots: { helmet: { itemId: 7 } } } });
        expect(result.current.isCalculatingStats).toBe(false);
        await act(async () => {
            fail(new Error("stary build"));
            await pending;
        });
        expect(result.current.calculationNotice).toBeNull();
    });
});
