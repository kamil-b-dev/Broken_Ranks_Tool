import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useOptimizerLabels } from "./useOptimizerLabels";
import { OPTIMIZER_LABEL_STORAGE_KEY } from "./optimizerLabels";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

it("synchronizes only its own preference and resets when another tab clears storage", () => {
    const { result, unmount } = renderHook(() => useOptimizerLabels());
    act(() => {
        localStorage.setItem(OPTIMIZER_LABEL_STORAGE_KEY, "DRIFS");
        window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    });
    expect(result.current.mode).toBe("MODIFIERS");
    act(() =>
        window.dispatchEvent(new StorageEvent("storage", { key: OPTIMIZER_LABEL_STORAGE_KEY }))
    );
    expect(result.current.mode).toBe("DRIFS");
    act(() => {
        localStorage.clear();
        window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.mode).toBe("MODIFIERS");
    unmount();
});

it("keeps session changes working when storage cannot be read or written", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
    });
    const { result } = renderHook(() => useOptimizerLabels());
    expect(result.current.mode).toBe("MODIFIERS");
    act(() => result.current.changeMode("DRIFS"));
    expect(result.current.mode).toBe("DRIFS");
});
