import { useMemo, useState } from "react";
import { SLOTS } from "../constants/equipment";
import { countEquippedSlots, groupItemsBySlot, indexItemsById } from "../components/workspaces/builderWorkspaceDomain";

/** Selects the active equipment slot and prepares lookup data for the builder. */
export const useBuilderWorkspace = ({ items = [], slots = {} }) => {
    const [activeSlotKey, setActiveSlotKey] = useState(SLOTS[0].key);
    const itemsBySlot = useMemo(() => groupItemsBySlot(items), [items]);
    const itemsById = useMemo(() => indexItemsById(items), [items]);
    const activeSlot = SLOTS.find((slot) => slot.key === activeSlotKey) || SLOTS[0];
    const activeSlotData = slots[activeSlot.key];

    return {
        activeSlot,
        activeItem: activeSlotData?.itemId ? itemsById.get(String(activeSlotData.itemId)) : null,
        equippedSlotCount: countEquippedSlots(slots),
        itemsBySlot,
        itemForSlot: (slot) => slots[slot.key]?.itemId ? itemsById.get(String(slots[slot.key].itemId)) : null,
        selectSlot: (slot) => setActiveSlotKey(slot.key),
    };
};
