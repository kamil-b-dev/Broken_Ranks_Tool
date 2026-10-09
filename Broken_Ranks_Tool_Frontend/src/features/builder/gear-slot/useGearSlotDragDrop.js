import { useDraggedResource, setDraggedResource } from "../useDraggedResource";
import { calculateUsedDrifPower } from "./gearSlotDomain";
import { useState } from "react";
import { SIZE_INDEX } from "../../../shared/domain/equipment/equipmentRules";

/** Owns drag state and applies validated item, orb, and drif drops to a gear slot. */
export const useGearSlotDragDrop = ({
    itemCapacity = Infinity,
    drifBasePowers = {},
    drifLevels = {},
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
    const draggedResource = useDraggedResource();
    const [dragOverZone, setDragOverZone] = useState(null);

    const handleDragOver = (event, zone) => {
        if (draggedResource && !canDrop(draggedResource, zone)) {
            if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
            setDragOverZone(null);
            return;
        }
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

    const canDropDrif = (payload, zone) => {
        const drif = drifs.find((candidate) => String(candidate.id) === String(payload.id));
        if (!drif) return false;
        const sizeIndex = SIZE_INDEX[drif.size?.toUpperCase()] ?? -1;
        if (!selectedItem || maxDrifs === 0 || sizeIndex < 0 || sizeIndex > maxDrifIndex)
            return false;
        const index = Number(zone.slice("drif-".length));
        if (!Number.isInteger(index) || index < 0 || index >= maxDrifs) return false;
        const hasDuplicateType = selectedDrifs.slice(0, maxDrifs).some((id, position) => {
            if (position === index || !id) return false;
            const selected = drifs.find((candidate) => String(candidate.id) === String(id));
            return selected?.bonusType === drif.bonusType;
        });
        if (hasDuplicateType) return false;
        const hasOtherElemental = selectedDrifs.slice(0, maxDrifs).some((id, position) => {
            if (position === index || !id) return false;
            const selected = drifs.find((candidate) => String(candidate.id) === String(id));
            return elementalTypes.includes(selected?.bonusType);
        });
        if (
            elementalTypes.includes(drif.bonusType) &&
            (slotKey !== "weapon" || hasOtherElemental)
        ) {
            return false;
        }
        const next = selectedDrifs.slice(0, maxDrifs);
        next[index] = String(drif.id);
        return (
            calculateUsedDrifPower({
                selectedDrifs: next,
                drifs,
                basePowers: drifBasePowers,
                levels: { ...drifLevels, [index]: 1 },
            }) <= itemCapacity
        );
    };
    const canDrop = (data, zone) => {
        if (!data) return false;
        if (data.dragType === "items" && zone === "item")
            return items.some((item) => String(item.id) === String(data.id));
        if (data.dragType === "orbs" && ["orb1", "orb2"].includes(zone)) {
            const available = zone === "orb1" ? availableOrbs1 : availableOrbs2;
            return (
                Boolean(selectedItem) && available.some((orb) => String(orb.id) === String(data.id))
            );
        }
        return data.dragType === "drifs" && zone.startsWith("drif-") && canDropDrif(data, zone);
    };
    const applyDrif = (payload, zone) => {
        if (!canDropDrif(payload, zone)) return;
        const drif = drifs.find((candidate) => String(candidate.id) === String(payload.id));
        const index = Number(zone.slice("drif-".length));
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
        setDraggedResource(null);
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

    return {
        dragOverZone,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        isDropEligible: (zone) => canDrop(draggedResource, zone),
    };
};
