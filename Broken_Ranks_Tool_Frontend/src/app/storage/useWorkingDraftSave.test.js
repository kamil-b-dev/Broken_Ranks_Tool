import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useWorkingDraftSave } from "./useWorkingDraftSave";
afterEach(() => vi.useRealTimers());

it("coalesces edits and flushes the current draft before leaving", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { rerender, unmount } = renderHook(
        ({ value, enabled }) => useWorkingDraftSave(save, value, enabled),
        { initialProps: { value: { stars: 1 }, enabled: true } }
    );
    rerender({ value: { stars: 2 }, enabled: true });
    rerender({ value: { stars: 9 }, enabled: true });
    expect(save).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(save).toHaveBeenCalledExactlyOnceWith({ stars: 9 });
    act(() => vi.advanceTimersByTime(200));
    expect(save).toHaveBeenCalledTimes(1);
    rerender({ value: { stars: 8 }, enabled: true });
    unmount();
    expect(save).toHaveBeenLastCalledWith({ stars: 8 });
});
it("does not overwrite a draft while its restoration is disabled", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { unmount } = renderHook(() => useWorkingDraftSave(save, {}, false));
    act(() => vi.advanceTimersByTime(200));
    unmount();
    expect(save).not.toHaveBeenCalled();
});
