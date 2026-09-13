import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppErrorBoundary from "./AppErrorBoundary";

const BrokenView = () => {
    throw new Error("render failed");
};

describe("AppErrorBoundary", () => {
    afterEach(() => vi.restoreAllMocks());

    it("shows a recoverable fallback after an unexpected render error", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        render(
            <AppErrorBoundary>
                <BrokenView />
            </AppErrorBoundary>
        );

        expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się wyświetlić aplikacji");
        expect(screen.getByRole("button", { name: "Odśwież aplikację" })).toBeInTheDocument();
    });
});
