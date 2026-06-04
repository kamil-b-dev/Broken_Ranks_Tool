import { useState, useEffect } from "react";
import { ROMAN_TO_INT, SIZE_INDEX } from "../utils/GearRules";

const getEffectiveMultiplier = (level) => {
    const lvl = parseInt(level) || 1;
    if (lvl <= 6) return 1;
    if (lvl <= 11) return 2;
    if (lvl <= 16) return 3;
    return 4;
};

const groupByType = (itemsList) => {
    if (!itemsList || !Array.isArray(itemsList)) return {};
    return itemsList.reduce((acc, item) => {
        const category = item.name || item.description || item.bonusType;
        if (!category) return acc;
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});
};

export const useGearSlot = ({ slotKey, items, orbs, drifs, allSlots, gameRules, onUpdate }) => {
    const { slotOrbRules = {}, elementalTypes = [], drifBasePowers = {} } = gameRules || {};

    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);

    const [selectedOrb, setSelectedOrb] = useState("");
    const [orbLevel, setOrbLevel] = useState("");

    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});

    const [orbType, setOrbType] = useState("");
    const [dragOverZone, setDragOverZone] = useState(null);

    const globalUsedOrbs = Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.orbId)
        .map(([k, v]) => orbs.find(o => o.id.toString() === v.orbId.toString())?.bonusType)
        .filter(Boolean);

    const allowedOrbCategories = slotOrbRules[slotKey] || [];
    const availableOrbs = orbs.filter(o =>
        !globalUsedOrbs.includes(o.bonusType) &&
        allowedOrbCategories.includes(o.category)
    );
    const groupedOrbs = groupByType(availableOrbs);

    const hasGlobalElemental = Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.drifIds)
        .some(([k, v]) => v.drifIds.some(dId => {
            const d = drifs.find(dr => dr.id.toString() === dId.toString());
            return d && elementalTypes.includes(d.bonusType);
        }));

    const fullSelectedItem = items.find(i => i.id.toString() === selectedItem.toString());
    const tierVal = fullSelectedItem ? (ROMAN_TO_INT[fullSelectedItem.tier] || 0) : 0;

    let maxDrifs = 0;
    if (fullSelectedItem) {
        if (tierVal >= 10) maxDrifs = 3;
        else if (tierVal >= 4) maxDrifs = 2;
        else if (tierVal >= 1) maxDrifs = 1;

        if ((tierVal === 2 || tierVal === 3) && itemStars >= 7) {
            maxDrifs += 1;
        }
    }

    const maxDrifIndex = tierVal <= 3 ? 0 : tierVal <= 6 ? 1 : tierVal <= 9 ? 2 : 3;

    const baseCapacity = fullSelectedItem?.capacity || 0;
    let capacityBonus = 0;
    if (itemStars >= 7 && itemStars < 8) capacityBonus = 1;
    else if (itemStars >= 8 && itemStars < 9) capacityBonus = 2;
    else if (itemStars >= 9) capacityBonus = 4;

    const itemCapacity = baseCapacity > 0 ? baseCapacity + capacityBonus : 0;

    const currentPowerUsed = selectedDrifs.reduce((sum, drifId, index) => {
        if (!drifId) return sum;
        const drif = drifs.find(d => d.id.toString() === drifId.toString());
        if (!drif) return sum;

        const basePower = drifBasePowers[drif.bonusType] || 0;
        const multiplier = getEffectiveMultiplier(drifLevels[index]);

        return sum + (basePower * multiplier);
    }, 0);

    const isOverCapacity = currentPowerUsed > itemCapacity;
    const isAtMaxCapacity = currentPowerUsed === itemCapacity && itemCapacity > 0;
    const capacityPercentage = itemCapacity > 0 ? Math.min((currentPowerUsed / itemCapacity) * 100, 100) : 0;

    const currentOrbObj = orbs.find(o => o.id.toString() === selectedOrb.toString());
    const isSubOrb = currentOrbObj?.size?.toUpperCase() === "SUBORB";
    const availableOrbLevels = isSubOrb ? [1] : [1, 2, 3];

    useEffect(() => {
        const validDrifIds = selectedDrifs.slice(0, maxDrifs).filter(id => id !== "");
        const validDrifLevels = {};
        for (let i = 0; i < maxDrifs; i++) {
            if (drifLevels[i]) validDrifLevels[i] = drifLevels[i];
        }

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            itemStars: itemStars,
            orbId: selectedOrb || null,
            orbLevel: orbLevel ? parseInt(orbLevel) : null,
            drifIds: validDrifIds.map(id => parseInt(id)),
            drifLevels: validDrifLevels
        });
    }, [selectedItem, itemStars, selectedOrb, orbLevel, selectedDrifs, drifLevels, maxDrifs]);

    const handleDragOver = (e, zone) => {
        e.preventDefault();
        setDragOverZone(zone);
    };

    const handleDragLeave = () => {
        setDragOverZone(null);
    };

    const handleDrop = (e, zone) => {
        e.preventDefault();
        setDragOverZone(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));

            if (data.dragType === "items" && zone === "item") {
                if (items.some(i => i.id.toString() === data.id.toString())) {
                    setSelectedItem(data.id.toString());
                    setItemStars(1);
                    setHoverStars(0);
                    setSelectedOrb("");
                    setOrbLevel("");
                    setOrbType("");
                    setSelectedDrifs([]);
                    setDrifTypes({});
                    setDrifLevels({});
                }
            } else if (data.dragType === "orbs" && zone === "orb") {
                if (!selectedItem) return;
                if (allowedOrbCategories.length > 0 && !allowedOrbCategories.includes(data.category)) return;

                const typeKey = data.name || data.description || data.bonusType;
                setOrbType(typeKey);
                setSelectedOrb(data.id.toString());
                setOrbLevel("1");
            } else if (data.dragType === "drifs" && zone.startsWith("drif-")) {
                if (!selectedItem || maxDrifs === 0) return;

                const targetIndex = parseInt(zone.split('-')[1]);

                if (SIZE_INDEX[data.size?.toUpperCase()] > maxDrifIndex) return;

                const localUsedBonusTypes = selectedDrifs
                    .map((dId, i) => i !== targetIndex && dId ? drifs.find(dr => dr.id.toString() === dId.toString())?.bonusType : null)
                    .filter(Boolean);

                if (localUsedBonusTypes.includes(data.bonusType)) return;

                if (elementalTypes.includes(data.bonusType)) {
                    if (slotKey !== "weapon") return;
                    if (hasGlobalElemental) return;
                    const hasLocalElemental = localUsedBonusTypes.some(type => elementalTypes.includes(type));
                    if (hasLocalElemental) return;
                }

                const typeKey = data.name || data.description || data.bonusType;
                setDrifTypes(prev => ({ ...prev, [targetIndex]: typeKey }));

                setSelectedDrifs(prev => {
                    const next = [...prev];
                    while (next.length < maxDrifs) next.push("");
                    next[targetIndex] = data.id.toString();
                    return next;
                });

                setDrifLevels(prev => ({ ...prev, [targetIndex]: 1 }));
            }
        } catch (error) {}
    };

    return {
        selectedItem, setSelectedItem,
        itemStars, setItemStars,
        hoverStars, setHoverStars,
        selectedOrb, setSelectedOrb,
        orbLevel, setOrbLevel,
        selectedDrifs, setSelectedDrifs,
        drifTypes, setDrifTypes,
        drifLevels, setDrifLevels,
        orbType, setOrbType,
        dragOverZone,
        groupedOrbs,
        fullSelectedItem,
        maxDrifs,
        itemCapacity,
        currentPowerUsed,
        isOverCapacity,
        isAtMaxCapacity,
        capacityPercentage,
        isSubOrb,
        availableOrbLevels,
        hasGlobalElemental,
        maxDrifIndex,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        groupByType
    };
};