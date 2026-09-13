import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ItemSection from "./ItemSection";

const createHookData = () => ({
    selectedItem: "",
    setSelectedItem: vi.fn(),
    itemStars: 1,
    setItemStars: vi.fn(),
    setBuiltInLvls: vi.fn(),
    hoverStars: 0,
    setHoverStars: vi.fn(),
    setOrbSlots: vi.fn(),
    setSelectedDrifs: vi.fn(),
    setDrifTypes: vi.fn(),
    setDrifLevels: vi.fn(),
});

describe("ItemSection", () => {
    it("resets dependent modifiers after selecting another item", async () => {
        const user = userEvent.setup();
        const hookData = createHookData();
        render(
            <ItemSection
                slotKey="helmet"
                label="Hełm"
                items={[{ id: 7, name: "Korona", tier: "VII", rarity: "EPIC" }]}
                fullSelectedItem={null}
                dragOverZone={null}
                handleDragOver={vi.fn()}
                handleDragLeave={vi.fn()}
                handleDrop={vi.fn()}
                hookData={hookData}
            />
        );

        await user.selectOptions(screen.getByLabelText("Wybierz przedmiot dla slotu Hełm"), "7");

        expect(hookData.setSelectedItem).toHaveBeenCalledWith("7");
        expect(hookData.setItemStars).toHaveBeenCalledWith(1);
        expect(hookData.setBuiltInLvls).toHaveBeenCalledWith([1, 1]);
        expect(hookData.setOrbSlots).toHaveBeenCalledWith({
            orb1: { id: "", level: "", type: "" },
            orb2: { id: "", level: "", type: "" },
        });
        expect(hookData.setSelectedDrifs).toHaveBeenCalledWith([]);
        expect(hookData.setDrifTypes).toHaveBeenCalledWith({});
        expect(hookData.setDrifLevels).toHaveBeenCalledWith({});
    });

    it("updates star preview and forwards drag-and-drop events", async () => {
        const user = userEvent.setup();
        const hookData = { ...createHookData(), selectedItem: "7", itemStars: 2 };
        const handleDragOver = vi.fn();
        const handleDragLeave = vi.fn();
        const handleDrop = vi.fn();
        const { container } = render(
            <ItemSection
                slotKey="helmet"
                label="Hełm"
                items={[]}
                fullSelectedItem={{ name: "Korona", tier: "VII", reqLevel: 140, rarity: "EPIC" }}
                dragOverZone="item"
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                hookData={hookData}
            />
        );

        const star = screen.getByTitle("Wzmocnienie: 5★");
        await user.hover(star);
        await user.unhover(star);
        await user.click(star);
        fireEvent.dragOver(container.firstChild);
        fireEvent.dragLeave(container.firstChild);
        fireEvent.drop(container.firstChild);

        expect(screen.getByText("Korona")).toBeInTheDocument();
        expect(screen.getByText("VII · poziom 140")).toBeInTheDocument();
        expect(hookData.setHoverStars).toHaveBeenCalledWith(5);
        expect(hookData.setHoverStars).toHaveBeenCalledWith(0);
        expect(hookData.setItemStars).toHaveBeenCalledWith(5);
        expect(handleDragOver).toHaveBeenCalledWith(expect.anything(), "item");
        expect(handleDragLeave).toHaveBeenCalled();
        expect(handleDrop).toHaveBeenCalledWith(expect.anything(), "item");
    });
});
