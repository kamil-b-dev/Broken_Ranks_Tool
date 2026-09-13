import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import TabList from "./TabList";

const tabs = [
    { value: "first", label: "Pierwsza" },
    { value: "second", label: "Druga" },
    { value: "third", label: "Trzecia" },
];

describe("TabList", () => {
    it("links tabs with panels and moves selection with the keyboard", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <TabList label="Widok" tabs={tabs} active="first" onChange={onChange} idPrefix="test" />
        );
        const first = screen.getByRole("tab", { name: "Pierwsza" });
        const second = screen.getByRole("tab", { name: "Druga" });

        expect(first).toHaveAttribute("aria-controls", "test-panel-first");
        expect(first).toHaveAttribute("tabindex", "0");
        expect(second).toHaveAttribute("tabindex", "-1");

        first.focus();
        await user.keyboard("{ArrowRight}");
        expect(onChange).toHaveBeenLastCalledWith("second");
        expect(second).toHaveFocus();

        await user.keyboard("{End}");
        expect(onChange).toHaveBeenLastCalledWith("third");
        await user.keyboard("{ArrowRight}");
        expect(onChange).toHaveBeenLastCalledWith("first");
    });
});
