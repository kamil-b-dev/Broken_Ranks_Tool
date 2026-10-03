import { useState } from "react";
import { SIZE_INDEX } from "../../../shared/domain/equipment/equipmentRules";

/** Owns drag state and applies validated item, orb, and drif drops to a gear slot. */
export const useGearSlotDragDrop = ({
    selectedItem,
    items = [],
    slotKey,
    availableOrbs1,
    availableOrbs2,
    maxDrifs,
    maxDrifIndex,
    elementalTypes,
    drifs = [],
    selectedDrifs = [],
    setSelectedItem,
    setBuiltInLvls,
    setOrbSlots,
    setSelectedDrifs,
    setDrifTypes,
    setDrifLevels,
}) => {
    const [dragOverZone, setDragOverZone] = useState(null);

    const handleDragOver = (event, zone) => {
        event.preventDefault();
        setDragOverZone(zone);
    };
    const handleDragLeave = () => setDragOverZone(null);

    const applyItem = (item) => {
        if (!items.some((candidate) => String(candidate.id) === String(item.id))) return;
        setSelectedItem(String(item.id));
        setBuiltInLvls([1, 1]);
        setOrbSlots({
            orb1: { id: "", level: "", type: "" },
            orb2: { id: "", level: "", type: "" },
        });
        setSelectedDrifs([]);
        setDrifTypes({});
        setDrifLevels({});
    };

    const applyOrb = (orb, orbSlotKey) => {
        if (!selectedItem) return;
        const available = orbSlotKey === "orb1" ? availableOrbs1 : availableOrbs2;
        if (!available.some((candidate) => candidate.id === orb.id)) return;
        setOrbSlots((previous) => ({
            ...previous,
            [orbSlotKey]: {
                id: String(orb.id),
                level: "1",
                type: orb.name || orb.bonusType,
            },
        }));
    };

    const applyDrif = (drif, zone) => {
        const sizeIndex = SIZE_INDEX[drif.size?.toUpperCase()] ?? -1;
        if (!selectedItem || maxDrifs === 0 || sizeIndex < 0 || sizeIndex > maxDrifIndex) return;
        const index = Number(zone.slice("drif-".length));
        if (!Number.isInteger(index) || index < 0 || index >= maxDrifs) return;
        const hasDuplicateType = selectedDrifs.slice(0, maxDrifs).some((id, position) => {
            if (position === index || !id) return false;
            const selected = drifs.find((candidate) => String(candidate.id) === String(id));
            return selected?.bonusType === drif.bonusType;
        });
        if (hasDuplicateType) return;
        const hasOtherElemental = selectedDrifs.slice(0, maxDrifs).some((id, position) => {
            if (position === index || !id) return false;
            const selected = drifs.find((candidate) => String(candidate.id) === String(id));
            return elementalTypes.includes(selected?.bonusType);
        });
        if (
            elementalTypes.includes(drif.bonusType) &&
            (slotKey !== "weapon" || hasOtherElemental)
        ) {
            return;
        }
        setDrifTypes((previous) => ({
            ...previous,
            [index]: drif.name || drif.bonusType,
        }));
        setSelectedDrifs((previous) => {
            const next = [...previous];
            next[index] = String(drif.id);
            return next;
        });
        setDrifLevels((previous) => ({ ...previous, [index]: 1 }));
    };

    const handleDrop = (event, zone) => {
        event.preventDefault();
        setDragOverZone(null);
        try {
            const data = JSON.parse(event.dataTransfer.getData("application/json"));
            if (data.dragType === "items" && zone === "item") applyItem(data);
            else if (data.dragType === "orbs" && ["orb1", "orb2"].includes(zone)) {
                applyOrb(data, zone);
            } else if (data.dragType === "drifs" && zone.startsWith("drif-")) {
                applyDrif(data, zone);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return { dragOverZone, handleDragOver, handleDragLeave, handleDrop };
};
