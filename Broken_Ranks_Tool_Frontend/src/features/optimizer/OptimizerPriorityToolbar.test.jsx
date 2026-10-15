import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import OptimizerPriorityToolbar from "./OptimizerPriorityToolbar";

const props = () => ({
    fileInputRef: { current: null },
    priorityCount: 3,
    sortDirection: "desc",
    categoryCounts: { OFFENSIVE: 1, DEFENSIVE: 1, UTILITY: 1 },
    onToggleCategory: vi.fn(),
    onShowAllCategories: vi.fn(),
    onSort: vi.fn(),
    onSortCategories: vi.fn(),
});
describe("priority category controls", () => {
    it("exposes visibility and counts and supports keyboard reveal when all categories are hidden", async () => {
        const user = userEvent.setup();
        const actions = props();
        render(
            <OptimizerPriorityToolbar
                {...actions}
                hiddenCategories={new Set(["OFFENSIVE", "DEFENSIVE", "UTILITY"])}
            />
        );
        const group = within(screen.getByRole("group", { name: "Widoczne kategorie priorytetów" }));
        for (const name of ["Ofensywne (1)", "Defensywne (1)", "Użytkowe (1)"]) {
            expect(group.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
        }
        expect(screen.getByRole("button", { name: "Kategorie", exact: true })).toBeEnabled();
        expect(screen.getByRole("button", { name: "Priorytet ↓" })).toBeEnabled();
        group.getByRole("button", { name: "Defensywne (1)" }).focus();
        await user.keyboard("{Enter}");
        expect(actions.onToggleCategory).toHaveBeenCalledWith("DEFENSIVE");
        await user.click(group.getByRole("button", { name: "Pokaż wszystkie" }));
        expect(actions.onShowAllCategories).toHaveBeenCalledOnce();
    });
    it("does not offer visibility actions or sorting before any priorities are configured", () => {
        render(<OptimizerPriorityToolbar {...props()} priorityCount={0} />);
        expect(
            screen.queryByRole("group", { name: "Widoczne kategorie priorytetów" })
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Kategorie", exact: true })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Priorytet ↓" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Wyczyść" })).not.toBeInTheDocument();
    });
});
