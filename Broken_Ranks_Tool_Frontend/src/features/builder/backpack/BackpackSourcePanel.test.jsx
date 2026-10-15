import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import { useDraggedResource } from "../useDraggedResource";
import BackpackSourcePanel from "./BackpackSourcePanel";

const entries = [
    {
        id: "item",
        kind: "ITEM",
        equipment: {
            itemId: "1",
            itemStars: 7,
            orbIds: [],
            orbLevels: [],
            drifIds: [],
            drifLevels: {},
        },
    },
    { id: "drif", kind: "DRIF", templateId: "60", level: 6 },
    { id: "orb", kind: "ORB", templateId: "50", level: 1 },
];
const setup = (owned = entries, getWarning = vi.fn(() => null)) => {
    const onEquip = vi.fn();
    const view = render(
        <BackpackSourcePanel
            entries={owned}
            data={builderCatalog}
            gameRules={builderCatalog.gameRules}
            activeSlot={{ key: "helmet", label: "Hełm" }}
            onEquip={onEquip}
            getWarning={getWarning}
        />
    );
    return { ...view, onEquip, getWarning };
};

describe("backpack equipment source", () => {
    it("filters and searches owned occurrences without equipping anything", () => {
        const { container, onEquip } = setup();
        expect(container.querySelectorAll(".backpack-source-card")).toHaveLength(3);
        fireEvent.click(screen.getByRole("button", { name: "Drify", exact: true }));
        expect(container.querySelectorAll(".backpack-source-card")).toHaveLength(1);
        expect(screen.getByRole("button", { name: /Band/ })).toBeInTheDocument();
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "BAND" } });
        expect(screen.getByRole("button", { name: /Band/ })).toBeInTheDocument();
        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Ochrona" } });
        expect(screen.getByText("Brak pasujących rzeczy w plecaku.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Orby", exact: true }));
        expect(screen.getByRole("button", { name: /Ochrona/ })).toBeInTheDocument();
        expect(onEquip).not.toHaveBeenCalled();
    });

    it("selects the destination socket, explains blocked placement and resets it for the next kind", () => {
        const { onEquip, getWarning } = setup(
            entries,
            vi.fn((_id, _slot, zone) => (zone === "orb2" ? "Najpierw umieść pierwszy orb." : null))
        );
        fireEvent.click(screen.getByRole("button", { name: /Ochrona/ }));
        const socket = screen.getByRole("combobox", { name: /Gniazdo w slocie Hełm/ });
        expect(socket).toHaveValue("orb1");
        fireEvent.change(socket, { target: { value: "orb2" } });
        expect(screen.getByRole("status")).toHaveTextContent("Najpierw umieść pierwszy orb.");
        expect(screen.getByRole("button", { name: "Załóż w slocie Hełm" })).toBeDisabled();
        expect(getWarning).toHaveBeenLastCalledWith("orb", "helmet", "orb2");
        fireEvent.change(socket, { target: { value: "orb1" } });
        fireEvent.click(screen.getByRole("button", { name: "Załóż w slocie Hełm" }));
        expect(onEquip).toHaveBeenLastCalledWith("orb", "helmet", "orb1");
        fireEvent.click(screen.getByRole("button", { name: /Band/ }));
        expect(screen.getByRole("combobox")).toHaveValue("drif-0");
        expect(screen.getAllByRole("option")).toHaveLength(3);
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "drif-2" } });
        fireEvent.click(screen.getByRole("button", { name: "Załóż w slocie Hełm" }));
        expect(onEquip).toHaveBeenLastCalledWith("drif", "helmet", "drif-2");
        fireEvent.click(screen.getByRole("button", { name: /Przedmiot.*podróżnika/ }));
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Załóż w slocie Hełm" }));
        expect(onEquip).toHaveBeenLastCalledWith("item", "helmet", "item");
        expect(onEquip).toHaveBeenCalledTimes(3);
    });

    it("drags the owned occurrence identity and clears the drag state when finished", () => {
        const { container } = setup();
        const dragged = renderHook(() => useDraggedResource());
        const button = screen.getByRole("button", { name: /Band/ });
        const transfer = { setData: vi.fn(), effectAllowed: "none" };
        fireEvent.dragStart(button.closest("article"), { dataTransfer: transfer });
        const resource = { id: 60, dragType: "drifs", source: "backpack", entryId: "drif" };
        expect(transfer.setData).toHaveBeenCalledExactlyOnceWith(
            "application/json",
            JSON.stringify(resource)
        );
        expect(transfer.effectAllowed).toBe("move");
        expect(dragged.result.current).toEqual(resource);
        fireEvent.dragEnd(container.querySelector("section"));
        expect(dragged.result.current).toBeNull();
    });

    it("does not export an occurrence whose template is missing from the current catalog", () => {
        const { container } = setup([{ id: "unknown", kind: "DRIF", templateId: "999", level: 1 }]);
        const card = container.querySelector("article");
        expect(card).toHaveAttribute("draggable", "false");
        const setData = vi.fn();
        fireEvent.dragStart(card, { dataTransfer: { setData } });
        expect(setData).not.toHaveBeenCalled();
    });
});
