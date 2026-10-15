import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import BackpackItemChoices from "./BackpackItemChoices";

const equipment = {
    itemId: "1",
    itemStars: 7,
    orbIds: [50],
    orbLevels: [1],
    drifIds: [60],
    drifLevels: { 0: 6 },
};
const ownedItem = (id, itemId = "1") => ({ id, kind: "ITEM", equipment: { ...equipment, itemId } });
const setup = (entries, getWarning = vi.fn(() => null)) => {
    const onSelect = vi.fn();
    render(
        <BackpackItemChoices
            entries={entries}
            items={[builderCatalog.items[0], { id: 999 }]}
            data={builderCatalog}
            gameRules={builderCatalog.gameRules}
            slotKey="helmet"
            onSelect={onSelect}
            getWarning={getWarning}
        />
    );
    return { onSelect, getWarning };
};

describe("mobile backpack item choices", () => {
    it("lists compatible owned items with their configured stones and blocks invalid equipment", () => {
        const { onSelect, getWarning } = setup(
            [
                ownedItem("ready"),
                ownedItem("blocked"),
                ownedItem("boots", "5"),
                ownedItem("missing", "999"),
                { id: "stone", kind: "DRIF", templateId: "60", level: 1 },
            ],
            vi.fn((id) => (id === "blocked" ? "Przekroczona pojemność." : null))
        );
        const ready = screen.getByRole("button", { name: /Przedmiot 1 z plecaka/ });
        expect(ready).toHaveTextContent("Band");
        expect(ready).toHaveTextContent("Ochrona");
        expect(screen.getByRole("button", { name: /Przedmiot 2 z plecaka/ })).toBeDisabled();
        expect(screen.getByText("Przekroczona pojemność.")).toBeInTheDocument();
        expect(screen.getAllByRole("button")).toHaveLength(2);
        expect(getWarning).toHaveBeenCalledWith("blocked", "helmet");
        fireEvent.click(ready);
        expect(onSelect).toHaveBeenCalledExactlyOnceWith("ready");
    });

    it("loads more occurrences and resets the visible page when searching", () => {
        setup(Array.from({ length: 45 }, (_, index) => ownedItem(`owned-${index}`)));
        expect(screen.getAllByRole("button", { name: /z plecaka/ })).toHaveLength(40);
        fireEvent.click(screen.getByRole("button", { name: "Pokaż kolejne przedmioty" }));
        expect(screen.getAllByRole("button", { name: /z plecaka/ })).toHaveLength(45);
        expect(
            screen.queryByRole("button", { name: "Pokaż kolejne przedmioty" })
        ).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "PODRÓŻNIKA" } });
        expect(screen.getAllByRole("button", { name: /z plecaka/ })).toHaveLength(40);
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nieistniejący" } });
        expect(screen.getByText("Brak pasujących przedmiotów w plecaku.")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
        expect(screen.getAllByRole("button", { name: /z plecaka/ })).toHaveLength(40);
    });
});
