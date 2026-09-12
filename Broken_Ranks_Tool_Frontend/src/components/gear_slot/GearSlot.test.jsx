import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GearSlot from "./GearSlot";

const mocks = vi.hoisted(() => ({
    gearSlot: {},
    equipment: {
        lockedSlots: [],
        toggleSlotLock: vi.fn(),
    },
}));

vi.mock("../../hooks/useGearSlot.js", () => ({
    useGearSlot: () => mocks.gearSlot,
}));

vi.mock("../../context/EquipmentContext", () => ({
    useEquipment: () => mocks.equipment,
}));

vi.mock("./ItemSection.jsx", () => ({
    default: () => <div data-testid="item-section" />,
}));
vi.mock("./OrbSection.jsx", () => ({
    default: ({ slotKey }) => <div data-testid={`orb-section-${slotKey}`} />,
}));
vi.mock("./DrifSection.jsx", () => ({
    default: () => <div data-testid="drif-section" />,
}));

const completeHookData = (overrides = {}) => ({
    isOverCapacity: false,
    fullSelectedItem: { id: 1, name: "Korona" },
    selectedItem: "1",
    dragOverZone: null,
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    isLegendary: false,
    orbSlots: {
        orb1: { type: "", id: "", level: "" },
        orb2: { type: "", id: "", level: "" },
    },
    setOrbSlots: vi.fn(),
    groupedOrbs1: {},
    groupedOrbs2: {},
    ...overrides,
});

const props = {
    label: "Hełm",
    items: [],
    drifs: [],
    slotKey: "helmet",
};

describe("GearSlot", () => {
    beforeEach(() => {
        mocks.gearSlot = completeHookData();
        mocks.equipment.lockedSlots = [];
        mocks.equipment.toggleSlotLock.mockReset();
    });

    it("renders a loading placeholder before game rules arrive", () => {
        render(<GearSlot {...props} gameRules={null} />);
        expect(screen.getByText("Ładowanie reguł...")).toBeInTheDocument();
    });

    it("renders all sections, a second legendary orb and the expanded layout", () => {
        mocks.gearSlot = completeHookData({ isLegendary: true, isOverCapacity: true });
        const { container } = render(
            <GearSlot
                {...props}
                gameRules={{ bonusTranslations: {}, drifBasePowers: {} }}
                expanded
                showOptimizationLocks
            />
        );

        expect(screen.getByTestId("item-section")).toBeInTheDocument();
        expect(screen.getByTestId("orb-section-orb1")).toBeInTheDocument();
        expect(screen.getByTestId("orb-section-orb2")).toBeInTheDocument();
        expect(screen.getByTestId("drif-section")).toBeInTheDocument();
        expect(container.firstChild).toHaveClass("gear-slot-editor-expanded", "border-red-600");
        fireEvent.click(screen.getByTitle("Zablokuj slot w optymalizatorze"));
        expect(mocks.equipment.toggleSlotLock).toHaveBeenCalledWith("helmet");
    });

    it("shows the unlock action for a locked slot and hides it without an item", () => {
        mocks.equipment.lockedSlots = ["helmet"];
        const { rerender } = render(<GearSlot {...props} gameRules={{}} showOptimizationLocks />);

        expect(screen.getByTitle("Odblokuj slot")).toBeInTheDocument();

        mocks.gearSlot = completeHookData({ fullSelectedItem: null });
        rerender(<GearSlot {...props} gameRules={{}} showOptimizationLocks />);
        expect(screen.queryByTitle("Odblokuj slot")).not.toBeInTheDocument();
    });
});
