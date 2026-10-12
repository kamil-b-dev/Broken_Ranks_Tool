import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import OptimizationElapsedTime from "./OptimizationElapsedTime";
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

it("updates only its own counter and pauses while the document is hidden", () => {
    vi.useFakeTimers();
    const clock = vi.spyOn(performance, "now").mockReturnValue(1000);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    let parentRenders = 0;
    function Parent() {
        parentRenders++;
        return (
            <span data-testid="time">
                <OptimizationElapsedTime startedAt={0} />
            </span>
        );
    }
    render(<Parent />);
    expect(screen.getByTestId("time")).toHaveTextContent("1");
    clock.mockReturnValue(2200);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("time")).toHaveTextContent("2");
    expect(parentRenders).toBe(1);
    hidden.mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    clock.mockReturnValue(5200);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId("time")).toHaveTextContent("2");
    hidden.mockReturnValue(false);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(screen.getByTestId("time")).toHaveTextContent("5");
    expect(parentRenders).toBe(1);
});
