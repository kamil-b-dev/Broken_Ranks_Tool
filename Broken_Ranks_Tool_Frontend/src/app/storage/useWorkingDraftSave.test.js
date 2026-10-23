import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useWorkingDraftSave } from "./useWorkingDraftSave";
afterEach(() => vi.useRealTimers());

it.each(["false", "throw"])("reports a %s save failure and retries the latest draft", (failure) => {
    vi.useFakeTimers();
    const save = vi.fn(() => {
        if (failure === "throw") throw new Error("quota");
        return false;
    });
    const { result, rerender } = renderHook(({ value }) => useWorkingDraftSave(save, value), {
        initialProps: { value: { stars: 1 } },
    });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.saveFailed).toBe(true);
    rerender({ value: { stars: 9 } });
    save.mockReturnValue(true);
    act(() => expect(result.current.retrySave()).toBe(true));
    expect(save).toHaveBeenLastCalledWith({ stars: 9 });
    expect(result.current.saveFailed).toBe(false);
    act(() => vi.advanceTimersByTime(200));
    expect(save).toHaveBeenCalledTimes(2);
});

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
