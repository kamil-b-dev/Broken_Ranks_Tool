import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileItemPicker from "./MobileItemPicker";

const items = Array.from({ length: 83 }, (_, index) => ({
    id: index + 1,
    name: `Hełm ${String(index + 1).padStart(2, "0")}`,
    tier: "X",
    capacity: 12,
}));

describe("MobileItemPicker", () => {
    beforeEach(() => {
        HTMLDialogElement.prototype.showModal = vi.fn(function () {
            this.open = true;
        });
        HTMLDialogElement.prototype.close = vi.fn(function () {
            this.open = false;
        });
    });
    afterEach(() => {
        cleanup();
        delete HTMLDialogElement.prototype.showModal;
        delete HTMLDialogElement.prototype.close;
    });

    it("keeps a large catalog bounded while making every item selectable", () => {
        const onSelect = vi.fn();
        const { container } = render(
            <MobileItemPicker
                items={items}
                slotLabel="Hełm"
                onSelect={onSelect}
                onClose={vi.fn()}
            />
        );
        const results = () => container.querySelectorAll(".mobile-picker-results button");
        expect(results()).toHaveLength(40);
        expect(screen.getByText("83 przedmiotów")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Poprzednia" })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Następna" }));
        expect(results()).toHaveLength(40);
        fireEvent.click(screen.getByRole("button", { name: "Następna" }));
        expect(results()).toHaveLength(3);
        expect(screen.getByRole("button", { name: "Następna" })).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: /Hełm 83/ }));
        fireEvent.click(screen.getByRole("button", { name: /Wyniki wyszukiwania/ }));
        expect(results()).toHaveLength(3);
        fireEvent.click(screen.getByRole("button", { name: "Poprzednia" }));
        expect(results()[0]).toHaveTextContent("Hełm 41");
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: " HEŁM 01 " } });
        expect(results()).toHaveLength(1);
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /Hełm 01/ }));
        fireEvent.click(screen.getByRole("button", { name: "Wybierz przedmiot" }));
        expect(onSelect).toHaveBeenCalledWith(items[0]);
        fireEvent.click(screen.getByRole("button", { name: /Wyniki wyszukiwania/ }));
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
        expect(results()).toHaveLength(40);
        expect(results()[0]).toHaveTextContent("Hełm 01");
    });
});
