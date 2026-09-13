import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useItemDatabaseFilters } from "./useItemDatabaseFilters";

describe("useItemDatabaseFilters", () => {
    it("tracks filters and resets them when the database tab changes", () => {
        const { result } = renderHook(() => useItemDatabaseFilters());

        act(() => result.current.setFilter("search", "morana"));
        expect(result.current.filters.search).toBe("morana");
        expect(result.current.hasActiveFilters).toBe(true);

        act(() => result.current.changeTab("orbs"));
        expect(result.current.activeTab).toBe("orbs");
        expect(result.current.filters.search).toBe("");
        expect(result.current.hasActiveFilters).toBe(false);
    });

    it("clears all filters without changing the active tab", () => {
        const { result } = renderHook(() => useItemDatabaseFilters());
        act(() => result.current.changeTab("drifs"));
        act(() => result.current.setFilter("basePower", "12"));
        act(() => result.current.clearFilters());

        expect(result.current.activeTab).toBe("drifs");
        expect(result.current.filters.basePower).toBe("");
    });
});
