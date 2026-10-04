import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import BuilderEquipmentWorkbench from "./BuilderEquipmentWorkbench";

describe("desktop equipment workbench regression", () => {
    it("keeps all circular slot selectors, compatible drops and bulk actions connected", () => {
        const helmet = { id: 7, name: "Hełm testowy", tier: "X" };
        const selectSlot = vi.fn();
        const onOverviewItemDrop = vi.fn();
        const onMaximizeLevels = vi.fn();
        const props = {
            model: {
                activeSlot: SLOTS[0],
                equippedSlotCount: 1,
                itemForSlot: (slot) => (slot.key === "helmet" ? helmet : null),
                itemsBySlot: { helmet: [helmet] },
                selectSlot,
            },
            data: { drifs: [], orbs: [] },
            requestData: { slots: { helmet: { itemId: 7, itemStars: 5 } } },
            gameRules: {},
            onOverviewItemDrop,
            onMaximizeLevels,
        };
        const { container, rerender } = render(<BuilderEquipmentWorkbench {...props} />);
        expect(container.querySelectorAll(".equipment-character-figure button")).toHaveLength(12);
        for (const slot of SLOTS) {
            fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${slot.label}`) }));
            expect(selectSlot).toHaveBeenLastCalledWith(slot);
        }
        const helmetButton = screen.getByRole("button", { name: /^Hełm/ });
        expect(helmetButton).toHaveAttribute("aria-pressed", "true");
        fireEvent.drop(helmetButton, {
            dataTransfer: { getData: () => JSON.stringify({ ...helmet, dragType: "items" }) },
        });
        expect(onOverviewItemDrop).toHaveBeenCalledWith(SLOTS[0], { ...helmet, dragType: "items" });
        fireEvent.click(screen.getByRole("button", { name: "max lvl orby" }));
        expect(onMaximizeLevels).toHaveBeenLastCalledWith("orbs");
        fireEvent.click(screen.getByRole("button", { name: "max lvl drify" }));
        expect(onMaximizeLevels).toHaveBeenLastCalledWith("drifs");
        rerender(
            <BuilderEquipmentWorkbench {...props} levelWarnings={["Hełm testowy: Band (6/21)."]} />
        );
        expect(screen.getByRole("status")).toHaveTextContent(
            "Za mało pojemności:Hełm testowy: Band (6/21)."
        );
    });
});
