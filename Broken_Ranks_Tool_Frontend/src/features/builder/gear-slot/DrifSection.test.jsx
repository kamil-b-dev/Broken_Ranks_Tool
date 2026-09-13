import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DrifSection from "./DrifSection";

const mocks = vi.hoisted(() => ({
    equipment: {
        lockedDrifs: {},
        lockedSlots: [],
        toggleDrifLock: vi.fn(),
    },
}));

vi.mock("../../../shared/state/EquipmentContext", () => ({
    useEquipment: () => mocks.equipment,
}));

vi.mock("./BuiltInDrifSlots", () => ({
    default: ({ drifs }) => <div data-testid="built-in-drifs">{drifs.join(",")}</div>,
}));

vi.mock("./StandardDrifSlot", () => ({
    default: ({ index, locked, parentLocked, onToggleLock }) => (
        <button
            type="button"
            data-testid={`standard-drif-${index}`}
            data-locked={String(locked)}
            data-parent-locked={String(parentLocked)}
            onClick={onToggleLock}
        >
            Drif {index + 1}
        </button>
    ),
}));

const hookData = (overrides = {}) => ({
    isEpicOrSet: false,
    builtInDrifs: [],
    builtInLvls: [1, 1],
    setBuiltInLvls: vi.fn(),
    maxDrifs: 2,
    maxDrifIndex: 1,
    itemCapacity: 10,
    currentPowerUsed: 7,
    isOverCapacity: false,
    isAtMaxCapacity: false,
    capacityPercentage: 70,
    selectedDrifs: [],
    setSelectedDrifs: vi.fn(),
    drifTypes: {},
    setDrifTypes: vi.fn(),
    drifLevels: {},
    setDrifLevels: vi.fn(),
    groupByType: vi.fn(),
    ...overrides,
});

const renderSection = (data, fullSelectedItem = { name: "Hełm" }) =>
    render(
        <DrifSection
            slotKey="helmet"
            drifs={[]}
            fullSelectedItem={fullSelectedItem}
            dragOverZone={null}
            handleDragOver={vi.fn()}
            handleDragLeave={vi.fn()}
            handleDrop={vi.fn()}
            hookData={data}
            bonusTranslations={{}}
            drifBasePowers={{}}
            showOptimizationLocks
        />
    );

describe("DrifSection", () => {
    beforeEach(() => {
        mocks.equipment.lockedDrifs = {};
        mocks.equipment.lockedSlots = [];
        mocks.equipment.toggleDrifLock.mockReset();
    });

    it("shows an empty state until an item is selected", () => {
        renderSection(hookData({ itemCapacity: 0, maxDrifs: 0 }), null);

        expect(screen.getByText("Wybierz przedmiot, aby odblokować gniazda")).toBeInTheDocument();
        expect(screen.queryByText(/Pojemność:/)).not.toBeInTheDocument();
    });

    it("shows capacity and combines direct drif locks with parent locks", () => {
        mocks.equipment.lockedDrifs = { helmet: [1] };
        const { rerender } = renderSection(
            hookData({ currentPowerUsed: 12, isOverCapacity: true, capacityPercentage: 120 })
        );

        expect(screen.getByText("Pojemność: 12/10")).toHaveClass("text-red-500");
        expect(screen.getByTestId("standard-drif-0")).toHaveAttribute("data-locked", "false");
        expect(screen.getByTestId("standard-drif-1")).toHaveAttribute("data-locked", "true");
        fireEvent.click(screen.getByTestId("standard-drif-0"));
        expect(mocks.equipment.toggleDrifLock).toHaveBeenCalledWith("helmet", 0);

        mocks.equipment.lockedSlots = ["helmet"];
        rerender(
            <DrifSection
                slotKey="helmet"
                drifs={[]}
                fullSelectedItem={{ name: "Hełm" }}
                dragOverZone={null}
                handleDragOver={vi.fn()}
                handleDragLeave={vi.fn()}
                handleDrop={vi.fn()}
                hookData={hookData()}
                bonusTranslations={{}}
                drifBasePowers={{}}
                showOptimizationLocks
            />
        );
        expect(screen.getByTestId("standard-drif-0")).toHaveAttribute("data-parent-locked", "true");
        expect(screen.getByTestId("standard-drif-0")).toHaveAttribute("data-locked", "true");
    });

    it("renders built-in drifs instead of standard sockets for epic items", () => {
        renderSection(hookData({ isEpicOrSet: true, builtInDrifs: ["DAMAGE_FIRE"] }));

        expect(screen.getByTestId("built-in-drifs")).toHaveTextContent("DAMAGE_FIRE");
        expect(screen.queryByTestId("standard-drif-0")).not.toBeInTheDocument();
    });
});
