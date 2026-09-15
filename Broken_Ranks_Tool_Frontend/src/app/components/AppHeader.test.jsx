import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppHeader from "./AppHeader";

const renderHeader = (overrides = {}) => {
    const props = {
        activeView: "home",
        buildCount: 2,
        disabled: false,
        fileInputRef: createRef(),
        onViewChange: vi.fn(),
        onSaveBuild: vi.fn(),
        onLoadBuild: vi.fn(),
        ...overrides,
    };

    render(<AppHeader {...props} />);
    return props;
};

describe("AppHeader", () => {
    it("navigates between views and exposes the build actions", async () => {
        const user = userEvent.setup();
        const props = renderHeader();

        expect(screen.getByLabelText("Broken Ranks Tool — strona główna")).toHaveAttribute(
            "aria-current",
            "page"
        );
        await user.click(screen.getByText("Broken Ranks Tool"));
        await user.click(screen.getByText("Kreator ekwipunku"));
        await user.click(screen.getByText("Optymalizator drifów"));
        await user.click(screen.getByText("Buildy lokalne"));
        expect(props.onViewChange.mock.calls.map(([view]) => view)).toEqual([
            "home",
            "builder",
            "optimizer",
            "builds",
        ]);

        await user.click(screen.getByRole("button", { name: "Zapisz lokalnie" }));
        expect(props.onSaveBuild).toHaveBeenCalledOnce();

        const input = document.querySelector('input[type="file"]');
        const click = vi.spyOn(input, "click");
        await user.click(screen.getByRole("button", { name: /Wczytaj build/ }));
        expect(click).toHaveBeenCalledOnce();

        fireEvent.change(input, { target: { files: [new File(["{}"], "build.json")] } });
        expect(props.onLoadBuild).toHaveBeenCalledOnce();
    });

    it("blocks protected actions while disabled and a full library cannot be saved", async () => {
        const user = userEvent.setup();
        const props = renderHeader({ activeView: "builder", buildCount: 10, disabled: true });

        expect(screen.getByText("Kreator ekwipunku").closest("a")).toHaveAttribute(
            "aria-current",
            "page"
        );
        await user.click(screen.getByText("Kreator ekwipunku"));
        await user.click(screen.getByText("Optymalizator drifów"));
        await user.click(screen.getByText("Buildy lokalne"));
        expect(props.onViewChange).not.toHaveBeenCalled();

        expect(screen.getByRole("button", { name: "Zapisz lokalnie" })).toBeDisabled();
        expect(screen.getByTitle("Biblioteka lokalna jest pełna")).toBeDisabled();
        expect(screen.getByRole("button", { name: /Wczytaj build/ })).toBeDisabled();
    });
});
