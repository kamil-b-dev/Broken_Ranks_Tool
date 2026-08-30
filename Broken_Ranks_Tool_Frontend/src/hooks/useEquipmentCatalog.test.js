import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInitialEquipmentData } from "../api/equipmentApi";
import { useEquipmentCatalog } from "./useEquipmentCatalog";

vi.mock("../api/equipmentApi", () => ({ fetchInitialEquipmentData: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("useEquipmentCatalog", () => {
    it("normalizes the backend catalog and dictionaries", async () => {
        fetchInitialEquipmentData.mockResolvedValue({
            items: [{ id: 1 }],
            gameRules: { drifBasePowers: {} },
            dictionaries: { itemCategories: { HELMET: "Hełm" } },
        });

        const { result } = renderHook(() => useEquipmentCatalog());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.data).toEqual({ items: [{ id: 1 }], orbs: [], drifs: [] });
        expect(result.current.categoryNames).toEqual({ HELMET: "Hełm" });
        expect(result.current.orbCategories).toEqual({});
        expect(result.current.gameRules).toEqual({ drifBasePowers: {} });
        expect(result.current.initialDataError).toBeNull();
    });

    it("exposes a backend message when catalog loading fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        fetchInitialEquipmentData.mockRejectedValue({
            response: { data: { message: "Brak danych gry" } },
        });

        const { result } = renderHook(() => useEquipmentCatalog());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.initialDataError).toBe("Brak danych gry");
        expect(result.current.data).toEqual({ items: [], orbs: [], drifs: [] });
    });
});
