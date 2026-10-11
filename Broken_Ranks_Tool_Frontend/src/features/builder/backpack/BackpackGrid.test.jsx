import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import BackpackGrid from "./BackpackGrid";

const entries = [
    { id: "first", kind: "DRIF", templateId: "60", level: 6 },
    { id: "second", kind: "ORB", templateId: "50", level: 1 },
];
const setup = (items = entries, overrides = {}) => {
    const model = {
        activeEntry: items[0],
        begin: vi.fn(),
        add: vi.fn(),
        select: vi.fn(),
        duplicate: vi.fn(),
        remove: vi.fn(),
        move: vi.fn(),
        ...overrides,
    };
    const view = render(
        <BackpackGrid
            entries={items}
            data={builderCatalog}
            gameRules={builderCatalog.gameRules}
            model={model}
        />
    );
    return { ...view, model };
};
describe("inventory grid drag and drop", () => {
    it("adds catalog copies using trusted templates and ignores foreign or malformed resources", () => {
        const { container, model } = setup([]);
        const zone = container.querySelector(".backpack-workbench");
        const transfer = {
            dropEffect: "none",
            getData: () =>
                JSON.stringify({
                    id: 1,
                    dragType: "items",
                    name: "Forged",
                    stats: { bonus: 9999 },
                }),
        };
        fireEvent.dragOver(zone, { dataTransfer: transfer });
        expect(transfer.dropEffect).toBe("copy");
        fireEvent.drop(zone, { dataTransfer: transfer });
        expect(model.add).toHaveBeenCalledWith("ITEM", builderCatalog.items[0]);
        for (const payload of [
            "not json",
            JSON.stringify({ id: 9999, dragType: "items" }),
            JSON.stringify({ id: 60, dragType: "unknown" }),
        ])
            fireEvent.drop(zone, { dataTransfer: { getData: () => payload } });
        expect(model.add).toHaveBeenCalledTimes(1);
        fireEvent.drop(zone, {
            dataTransfer: { getData: () => JSON.stringify({ id: 50, dragType: "orbs" }) },
        });
        expect(model.add).toHaveBeenLastCalledWith("ORB", builderCatalog.orbs[0]);
        fireEvent.click(screen.getByRole("button", { name: "+ Dodaj drif" }));
        expect(model.begin).toHaveBeenCalledWith("DRIF");
    });
    it("reorders only local occurrence data and exposes equivalent keyboard controls", () => {
        const { container, model } = setup();
        const cards = container.querySelectorAll(".backpack-card");
        const transfer = {
            types: ["application/x-broken-ranks-backpack-entry"],
            setData: vi.fn(),
            getData: (kind) =>
                kind === "application/x-broken-ranks-backpack-entry" ? "first" : "",
            dropEffect: "none",
        };
        fireEvent.dragStart(cards[0], { dataTransfer: transfer });
        expect(transfer.setData).toHaveBeenCalledWith(
            "application/x-broken-ranks-backpack-entry",
            "first"
        );
        fireEvent.dragOver(cards[1], { dataTransfer: transfer });
        expect(transfer.dropEffect).toBe("move");
        fireEvent.drop(cards[1], { dataTransfer: transfer });
        expect(model.move).toHaveBeenCalledWith("first", "second");
        expect(model.add).not.toHaveBeenCalled();
        fireEvent.dragOver(cards[1], { dataTransfer: { types: [] } });
        fireEvent.drop(cards[1], { dataTransfer: { getData: () => "" } });
        fireEvent.click(screen.getByRole("button", { name: "Przesuń później: Band" }));
        expect(model.move).toHaveBeenCalledTimes(2);
        fireEvent.click(screen.getByRole("button", { name: "Przesuń wcześniej: Ochrona" }));
        expect(model.move).toHaveBeenLastCalledWith("second", "first");
        fireEvent.click(screen.getByRole("button", { name: /Drif Band/ }));
        expect(model.select).toHaveBeenCalledWith("first");
        fireEvent.click(screen.getByRole("button", { name: "Duplikuj: Ochrona" }));
        expect(model.duplicate).toHaveBeenCalledWith(entries[1]);
        fireEvent.click(screen.getByRole("button", { name: "Usuń z plecaka: Band" }));
        expect(model.remove).toHaveBeenCalledWith("first");
    });
});
