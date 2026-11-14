import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import OptimizerRunAction from "./OptimizerRunAction";
import apiClient from "../../shared/api/axiosConfig";
import {
    postCalculation,
    subscribeCalculationCooldown,
} from "../../shared/api/calculationCooldown";

vi.mock("../../shared/api/axiosConfig", () => ({ default: { post: vi.fn() } }));

afterEach(() => {
    if (vi.isFakeTimers()) {
        const unsubscribe = subscribeCalculationCooldown(() => {});
        act(() => vi.advanceTimersByTime(120000));
        unsubscribe();
        vi.useRealTimers();
    }
    cleanup();
    vi.clearAllMocks();
});

it.each([
    ["BUILD_FROM_SCRATCH", false, "RUN OPTIMIZATION"],
    ["BUILD_FROM_SCRATCH", true, "OPTIMIZE AGAIN"],
    ["ADVISOR", false, "ANALYZE BUILD"],
    ["ADVISOR", true, "ANALYZE AGAIN"],
])("translates the English %s action after result=%s", (mode, hasResult, label) => {
    render(
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <OptimizerRunAction
                mode={mode}
                hasResult={hasResult}
                priorityCount={1}
                lastDurationSeconds={null}
                onRun={vi.fn()}
            />
        </LanguageContext.Provider>
    );
    expect(screen.getByRole("button", { name: label, exact: true })).toBeEnabled();
});

it("shows a live translated countdown by the disabled action, keeps it after a mode change and enables manual retry", async () => {
    vi.useFakeTimers();
    apiClient.post.mockRejectedValueOnce({
        response: { status: 429, headers: { "retry-after": "37" } },
    });
    const onRun = vi.fn(() => postCalculation("/optimizer/drifs", {}).catch(() => {}));
    const action = (mode) => (
        <LanguageContext.Provider value={{ language: "en", setLanguage: vi.fn() }}>
            <OptimizerRunAction
                mode={mode}
                priorityCount={1}
                lastDurationSeconds={null}
                onRun={onRun}
            />
        </LanguageContext.Provider>
    );
    const { rerender } = render(action("ADVISOR"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "ANALYZE BUILD" })));
    expect(screen.getByRole("timer")).toHaveTextContent("Try again in 37 s.");
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAccessibleDescription("Try again in 37 s.");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer")).toHaveTextContent("Try again in 36 s.");
    rerender(action("BUILD_FROM_SCRATCH"));
    expect(screen.getByRole("button", { name: "RUN OPTIMIZATION" })).toBeDisabled();

    // Browser timers can be suspended in a background tab; resync from the deadline on focus.
    vi.setSystemTime(Date.now() + 36000);
    fireEvent.focus(window);
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toBeEnabled();
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
});
