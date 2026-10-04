import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BuilderWorkspace from "./BuilderWorkspace";
import { useBuilderWorkspace } from "./useBuilderWorkspace";

vi.mock("./useBuilderWorkspace", () => ({ useBuilderWorkspace: vi.fn() }));
vi.mock("./character/CharacterPanel", () => ({ default: () => <div>Postać</div> }));
vi.mock("./item-database/ItemDatabase", () => ({ default: () => <div>Baza</div> }));
vi.mock("./stats-panel/StatsPanel", () => ({ default: () => <div>Statystyki</div> }));
vi.mock("./gear-slot/SelectedSlotEditor", () => ({ default: () => <div>Edytor</div> }));
vi.mock("./BuilderEquipmentWorkbench", () => ({
    default: ({ children, onOverviewItemDrop, onMaximizeLevels, levelWarnings }) => (
        <section>
            {children}
            <button onClick={() => onMaximizeLevels("drifs")}>max lvl drify</button>
            <button onClick={() => onMaximizeLevels("orbs")}>max lvl orby</button>
            <div role="status">{levelWarnings.join(" ")}</div>
            <button type="button" onClick={() => onOverviewItemDrop({ key: "helmet" }, { id: 7 })}>
                Upuść hełm
            </button>
        </section>
    ),
}));

const props = {
    data: { items: [], orbs: [], drifs: [] },
    categoryNames: {},
    orbCategories: {},
    drifCategories: {},
    gameRules: {},
    requestData: { slots: {} },
    stats: null,
    statSources: null,
    isCalculatingStats: false,
    optimizationTrigger: 3,
    characterConfig: null,
    onSlotUpdate: vi.fn(),
    onCharacterStatsUpdate: vi.fn(),
    onCalculateStats: vi.fn(),
};

describe("BuilderWorkspace", () => {
    const selectSlot = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        useBuilderWorkspace.mockReturnValue({ selectSlot });
    });

    it("composes the active builder and equips an item dropped on an overview slot", () => {
        render(<BuilderWorkspace {...props} />);

        fireEvent.click(screen.getByRole("button", { name: "Upuść hełm" }));

        expect(props.onSlotUpdate).toHaveBeenCalledWith("helmet", {
            itemId: "7",
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: [],
            drifLevels: {},
        });
        expect(selectSlot).toHaveBeenCalledWith({ key: "helmet" });
        expect(screen.getByRole("main")).toHaveAttribute("id", "workspace-content");
    });

    it("applies bulk levels and shows capacity warnings", () => {
        const slot = {
            itemId: 7,
            itemStars: 1,
            drifIds: [1, 2],
            drifLevels: {},
            orbIds: [3],
            orbLevels: [1],
        };
        render(
            <BuilderWorkspace
                {...props}
                requestData={{ slots: { helmet: slot } }}
                data={{
                    items: [{ id: 7, name: "Hełm", rarity: "RARE", capacity: 2 }],
                    drifs: [
                        { id: 1, name: "Pierwszy", size: "ARCYDRIF", bonusType: "HP" },
                        { id: 2, name: "Drugi", size: "ARCYDRIF", bonusType: "MP" },
                    ],
                    orbs: [{ id: 3, size: "BIORB" }],
                }}
                gameRules={{ drifBasePowers: { HP: 1, MP: 1 } }}
            />
        );
        fireEvent.click(screen.getByRole("button", { name: "max lvl drify" }));
        expect(props.onSlotUpdate).toHaveBeenCalledWith("helmet", {
            ...slot,
            drifLevels: { 0: 6, 1: 6 },
        });
        expect(screen.getByRole("status")).toHaveTextContent(
            "Hełm: Pierwszy (6/21), Drugi (6/21)."
        );
        fireEvent.click(screen.getByRole("button", { name: "max lvl orby" }));
        expect(props.onSlotUpdate).toHaveBeenLastCalledWith("helmet", { ...slot, orbLevels: [3] });
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("keeps an inactive builder outside the active workspace landmark", () => {
        render(<BuilderWorkspace {...props} active={false} />);

        expect(screen.getByRole("main", { hidden: true })).not.toHaveAttribute("id");
        expect(screen.getByRole("main", { hidden: true })).toHaveAttribute("hidden");
    });
});
