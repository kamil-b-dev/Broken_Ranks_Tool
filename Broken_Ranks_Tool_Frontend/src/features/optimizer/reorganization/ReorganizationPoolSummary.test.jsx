import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    EquipmentBackpackContext,
    EquipmentCatalogContext,
    EquipmentLocksContext,
    EquipmentSetupContext,
} from "../../../shared/state/EquipmentContext";
import ReorganizationPoolSummary from "./ReorganizationPoolSummary";

const items = [
    { id: 1, rarity: "RARE" },
    { id: 2, rarity: "LEGENDARY" },
    { id: 3, rarity: "EPIC" },
    { id: 4, rarity: "SET" },
];
const slots = {
    helmet: { itemId: "1", drifIds: [60, null, 60] },
    armor: { itemId: 2, drifIds: [60, 61] },
    weapon: { itemId: 3, drifIds: [60] },
    boots: { itemId: 4, drifIds: [60] },
    gloves: { itemId: null, drifIds: [] },
};
const View = ({ backpack, locks = { lockedSlots: ["armor"], lockedDrifs: { helmet: [0] } } }) => (
    <EquipmentCatalogContext.Provider value={{ data: { items } }}>
        <EquipmentSetupContext.Provider value={{ requestData: { slots } }}>
            <EquipmentLocksContext.Provider value={locks}>
                <EquipmentBackpackContext.Provider value={{ backpack }}>
                    <ReorganizationPoolSummary />
                </EquipmentBackpackContext.Provider>
            </EquipmentLocksContext.Provider>
        </EquipmentSetupContext.Provider>
    </EquipmentCatalogContext.Provider>
);

describe("ReorganizationPoolSummary", () => {
    it("counts movable ordinary stones and only selected loose backpack drifs", () => {
        render(
            <View
                backpack={[
                    { id: "selected", kind: "DRIF", sendToBackend: true },
                    { id: "unselected", kind: "DRIF" },
                    { id: "orb", kind: "ORB" },
                    { id: "item", kind: "ITEM", equipment: { drifIds: [60] } },
                ]}
            />
        );
        expect(screen.getByText("Ekwipunek: 1 · Zaznaczone w plecaku: 1")).toBeVisible();
    });
    it("updates the count after backpack selection and lock changes", () => {
        const { rerender } = render(<View backpack={[]} />);
        expect(screen.getByText("Ekwipunek: 1 · Zaznaczone w plecaku: 0")).toBeVisible();
        rerender(
            <View
                backpack={[{ id: "selected", kind: "DRIF", sendToBackend: true }]}
                locks={{ lockedSlots: [], lockedDrifs: {} }}
            />
        );
        expect(screen.getByText("Ekwipunek: 4 · Zaznaczone w plecaku: 1")).toBeVisible();
    });
});
