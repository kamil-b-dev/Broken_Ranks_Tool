import { useState, useEffect, useMemo } from "react";
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
    const { slotOrbRules = {}, elementalTypes = [], drifBasePowers = {}, epicBuiltInDrifs = {}, bonusTranslations = {} } = gameRules || {};

    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);

    const [orbSlots, setOrbSlots] = useState({
        orb1: { id: "", level: "", type: "" },
        orb2: { id: "", level: "", type: "" },
    });

    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});
    const [builtInLvls, setBuiltInLvls] = useState([1, 1]);
    const [dragOverZone, setDragOverZone] = useState(null);

    const fullSelectedItem = useMemo(() => items.find(i => i.id.toString() === selectedItem.toString()), [items, selectedItem]);
    const tierVal = fullSelectedItem ? (ROMAN_TO_INT[fullSelectedItem.tier] || 0) : 0;
    const isLegendary = fullSelectedItem?.rarity?.toUpperCase() === 'LEGENDARY';
    const isEpicOrSet = fullSelectedItem && ['EPIC', 'SET'].includes(fullSelectedItem.rarity?.toUpperCase());

    const builtInDrifs = useMemo(() => {
        if (!isEpicOrSet) return [];
        const baseItemName = fullSelectedItem?.name?.replace(/\s+[IVX]+$/, '').trim();
        const bonusTypes = epicBuiltInDrifs[baseItemName] || [];

        return bonusTypes.map(bonusType => {
            const foundDrif = drifs.find(d => d.size?.toUpperCase() === 'MAGNIDRIF' && d.bonusType === bonusType);
            return {
                id: foundDrif ? foundDrif.id : null,
                bonusType: bonusType,
                displayName: bonusTranslations?.[bonusType] || bonusType
            };
        });
    }, [isEpicOrSet, fullSelectedItem?.name, epicBuiltInDrifs, drifs, bonusTranslations]);

    const globalUsedOrbs = useMemo(() => Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.orbIds)
        .flatMap(([k, v]) => v.orbIds)
        .map(orbId => orbs.find(o => o.id.toString() === orbId.toString())?.bonusType)
        .filter(Boolean), [allSlots, slotKey, orbs]);

    const allowedOrbCategories = slotOrbRules[slotKey] || [];

    const availableOrbs1 = useMemo(() => {
        return orbs.filter(o => {
            const orbTierVal = ROMAN_TO_INT[o.tier] || 0;
            const isAllowed = allowedOrbCategories.includes(o.category) || (isLegendary && o.category === 'OFENSIVE');
            const isNotUsedGlobally = !globalUsedOrbs.includes(o.bonusType);
            const isTierValid = tierVal > 0 ? orbTierVal <= tierVal : true;
            return isAllowed && isNotUsedGlobally && isTierValid;
        });
    }, [orbs, globalUsedOrbs, allowedOrbCategories, tierVal, isLegendary]);

    const availableOrbs2 = useMemo(() => {
        if (!isLegendary) return [];
        const firstOrbBonusType = orbs.find(o => o.id.toString() === orbSlots.orb1.id)?.bonusType;
        return orbs.filter(o => {
            const orbTierVal = ROMAN_TO_INT[o.tier] || 0;
            const isAllowed = o.category === 'OFENSIVE';
            const isNotUsedGlobally = !globalUsedOrbs.includes(o.bonusType);
            const isNotUsedInSlot1 = o.bonusType !== firstOrbBonusType;
            const isTierValid = tierVal > 0 ? orbTierVal <= tierVal : true;
            return isAllowed && isNotUsedGlobally && isNotUsedInSlot1 && isTierValid;
        });
    }, [orbs, globalUsedOrbs, tierVal, isLegendary, orbSlots.orb1.id]);

    const groupedOrbs1 = useMemo(() => groupByType(availableOrbs1), [availableOrbs1]);
    const groupedOrbs2 = useMemo(() => groupByType(availableOrbs2), [availableOrbs2]);

    const hasGlobalElemental = useMemo(() => Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.drifIds)
        .some(([k, v]) => v.drifIds.some(dId => {
            const d = drifs.find(dr => dr.id.toString() === dId.toString());
            return d && elementalTypes.includes(d.bonusType);
        })), [allSlots, slotKey, drifs, elementalTypes]);

    const maxDrifs = useMemo(() => {
        if (!fullSelectedItem) return 0;
        if (isEpicOrSet) return 0;

        let max = 0;
        if (tierVal >= 10) max = 3;
        else if (tierVal >= 4) max = 2;
        else if (tierVal >= 1) max = 1;
        if ((tierVal === 2 || tierVal === 3) && itemStars >= 7) max += 1;
        return max;
    }, [fullSelectedItem, tierVal, itemStars, isEpicOrSet]);

    const maxDrifIndex = useMemo(() => {
        if (!fullSelectedItem || isEpicOrSet) return -1;
        if (tierVal >= 10) return 3;
        if (tierVal >= 7) return 2;
        if (tierVal >= 4) return 1;
        return 0;
    }, [tierVal, fullSelectedItem, isEpicOrSet]);

    const itemCapacity = useMemo(() => {
        const baseCapacity = fullSelectedItem?.capacity || 0;
        if (baseCapacity === 0) return 0;
        let bonus = 0;
        if (itemStars >= 7 && itemStars < 8) bonus = 1;
        else if (itemStars >= 8 && itemStars < 9) bonus = 2;
        else if (itemStars >= 9) bonus = 4;
        return baseCapacity + bonus;
    }, [fullSelectedItem, itemStars]);

    const currentPowerUsed = useMemo(() => selectedDrifs.reduce((sum, drifId, index) => {
        if (!drifId) return sum;
        const drif = drifs.find(d => d.id.toString() === drifId.toString());
        if (!drif) return sum;
        const basePower = drifBasePowers[drif.bonusType] || 0;
        return sum + (basePower * getEffectiveMultiplier(drifLevels[index]));
    }, 0), [selectedDrifs, drifs, drifBasePowers, drifLevels]);

    const isOverCapacity = currentPowerUsed > itemCapacity;
    const isAtMaxCapacity = currentPowerUsed === itemCapacity && itemCapacity > 0;
    const capacityPercentage = itemCapacity > 0 ? Math.min((currentPowerUsed / itemCapacity) * 100, 100) : 0;

    useEffect(() => {
        const validDrifIds = selectedDrifs.slice(0, maxDrifs).filter(id => id !== "");
        const validDrifLevels = {};
        for (let i = 0; i < maxDrifs; i++) { if (drifLevels[i]) validDrifLevels[i] = drifLevels[i]; }

        const allDrifIds = [...validDrifIds];
        builtInDrifs.forEach((bDrif, idx) => {
            if (bDrif.id) {
                const appendedIndex = allDrifIds.length;
                allDrifIds.push(parseInt(bDrif.id));
                validDrifLevels[appendedIndex] = builtInLvls[idx] || 1;
            }
        });

        const orbIds = [orbSlots.orb1.id, isLegendary ? orbSlots.orb2.id : null].filter(Boolean);
        const orbLevels = [orbSlots.orb1.level, isLegendary ? orbSlots.orb2.level : null].filter(Boolean).map(l => parseInt(l));

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            itemStars: itemStars,
            orbIds: orbIds,
            orbLevels: orbLevels,
            drifIds: allDrifIds,
            drifLevels: validDrifLevels
        });
    }, [selectedItem, itemStars, orbSlots, isLegendary, selectedDrifs, drifLevels, maxDrifs, builtInLvls, builtInDrifs, slotKey, onUpdate]);

    const handleDragOver = (e, zone) => { e.preventDefault(); setDragOverZone(zone); };
    const handleDragLeave = () => setDragOverZone(null);

    const handleItemDrop = (data) => {
        setSelectedItem(data.id.toString());
        setBuiltInLvls([1, 1]);
        setOrbSlots({ orb1: { id: "", level: "", type: "" }, orb2: { id: "", level: "", type: "" } });
        setSelectedDrifs([]); setDrifTypes({}); setDrifLevels({});
    };

    const handleOrbDrop = (data, orbSlotKey) => {
        if (!selectedItem) return;

        const isMainSlot = orbSlotKey === 'orb1';
        const available = isMainSlot ? availableOrbs1 : availableOrbs2;
        if (!available.some(o => o.id === data.id)) return;

        setOrbSlots(prev => ({
            ...prev,
            [orbSlotKey]: { id: data.id.toString(), level: "1", type: data.name || data.bonusType }
        }));
    };

    const handleDrifDrop = (data, zone) => {
        if (!selectedItem || maxDrifs === 0 || SIZE_INDEX[data.size?.toUpperCase()] > maxDrifIndex) return;

        const idx = parseInt(zone.split('-')[1]);
        if (elementalTypes.includes(data.bonusType) && (slotKey !== "weapon" || hasGlobalElemental)) return;

        setDrifTypes(prev => ({ ...prev, [idx]: data.name || data.bonusType }));
        setSelectedDrifs(prev => { const n = [...prev]; n[idx] = data.id.toString(); return n; });
        setDrifLevels(prev => ({ ...prev, [idx]: 1 }));
    };

    const handleDrop = (e, zone) => {
        e.preventDefault();
        setDragOverZone(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));

            if (data.dragType === "items" && zone === "item") {
                handleItemDrop(data);
            } else if (data.dragType === "orbs" && (zone === "orb1" || zone === "orb2")) {
                handleOrbDrop(data, zone);
            } else if (data.dragType === "drifs" && zone.startsWith("drif-")) {
                handleDrifDrop(data, zone);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return {
        selectedItem, setSelectedItem, itemStars, setItemStars, builtInLvls, setBuiltInLvls,
        isEpicOrSet, isLegendary, builtInDrifs, hoverStars, setHoverStars, orbSlots, setOrbSlots,
        selectedDrifs, setSelectedDrifs, drifTypes, setDrifTypes,
        drifLevels, setDrifLevels, dragOverZone, groupedOrbs1, groupedOrbs2,
        fullSelectedItem, maxDrifs, maxDrifIndex, itemCapacity, currentPowerUsed, isOverCapacity,
        isAtMaxCapacity, capacityPercentage, handleDragOver,
        handleDragLeave, handleDrop, groupByType
    };
};
