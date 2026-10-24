import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LanguageContext } from "../../shared/i18n/LanguageContext";
import OptimizerRunAction from "./OptimizerRunAction";

afterEach(cleanup);

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
