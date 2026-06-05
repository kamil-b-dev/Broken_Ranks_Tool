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
    const { slotOrbRules = {}, elementalTypes = [], drifBasePowers = {}, epicBuiltInDrifs = {} } = gameRules || {};

    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);
    const [selectedOrb, setSelectedOrb] = useState("");
    const [orbLevel, setOrbLevel] = useState("");
    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});
    const [builtInLvls, setBuiltInLvls] = useState([1, 1]);
    const [orbType, setOrbType] = useState("");
    const [dragOverZone, setDragOverZone] = useState(null);

    // --- MEMOIZACJA CIĘŻKICH OPERACJI ---

    const fullSelectedItem = useMemo(() => items.find(i => i.id.toString() === selectedItem.toString()), [items, selectedItem]);
    const tierVal = fullSelectedItem ? (ROMAN_TO_INT[fullSelectedItem.tier] || 0) : 0;
    const isEpicOrSet = fullSelectedItem && ['EPIC', 'SET'].includes(fullSelectedItem.rarity?.toUpperCase());

    const builtInDrifs = useMemo(() => {
        if (!isEpicOrSet) return [];
        const bonusTypes = epicBuiltInDrifs[fullSelectedItem?.name] || [];
        return bonusTypes.map(bonusType => {
            const foundDrif = drifs.find(d => d.size?.toUpperCase() === 'MAGNIDRIF' && d.bonusType === bonusType);
            return {
                id: foundDrif ? foundDrif.id : null,
                bonusType: bonusType,
                displayName: gameRules?.bonusTranslations?.[bonusType] || bonusType
            };
        });
    }, [isEpicOrSet, fullSelectedItem, epicBuiltInDrifs, drifs, gameRules]);

    const globalUsedOrbs = useMemo(() => Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.orbId)
        .map(([k, v]) => orbs.find(o => o.id.toString() === v.orbId.toString())?.bonusType)
        .filter(Boolean), [allSlots, slotKey, orbs]);

    const allowedOrbCategories = slotOrbRules[slotKey] || [];

    const availableOrbs = useMemo(() =>
            orbs.filter(o => !globalUsedOrbs.includes(o.bonusType) && allowedOrbCategories.includes(o.category)),
        [orbs, globalUsedOrbs, allowedOrbCategories]);

    const groupedOrbs = useMemo(() => groupByType(availableOrbs), [availableOrbs]);

    const hasGlobalElemental = useMemo(() => Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.drifIds)
        .some(([k, v]) => v.drifIds.some(dId => {
            const d = drifs.find(dr => dr.id.toString() === dId.toString());
            return d && elementalTypes.includes(d.bonusType);
        })), [allSlots, slotKey, drifs, elementalTypes]);

    const maxDrifs = useMemo(() => {
        if (!fullSelectedItem) return 0;
        let max = 0;
        if (tierVal >= 10) max = 3;
        else if (tierVal >= 4) max = 2;
        else if (tierVal >= 1) max = 1;
        if ((tierVal === 2 || tierVal === 3) && itemStars >= 7) max += 1;
        return max;
    }, [fullSelectedItem, tierVal, itemStars]);

    const maxDrifIndex = tierVal <= 3 ? 0 : tierVal <= 6 ? 1 : tierVal <= 9 ? 2 : 3;

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

    const currentOrbObj = useMemo(() => orbs.find(o => o.id.toString() === selectedOrb.toString()), [orbs, selectedOrb]);
    const isSubOrb = currentOrbObj?.size?.toUpperCase() === "SUBORB";
    const availableOrbLevels = isSubOrb ? [1] : [1, 2, 3];


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

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            itemStars: itemStars,
            orbId: selectedOrb || null,
            orbLevel: orbLevel ? parseInt(orbLevel) : null,
            drifIds: allDrifIds,
            drifLevels: validDrifLevels
        });
    }, [selectedItem, itemStars, selectedOrb, orbLevel, selectedDrifs, drifLevels, maxDrifs, builtInLvls]);

    const handleDragOver = (e, zone) => { e.preventDefault(); setDragOverZone(zone); };
    const handleDragLeave = () => setDragOverZone(null);

    const handleDrop = (e, zone) => {
        e.preventDefault();
        setDragOverZone(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data.dragType === "items" && zone === "item") {
                setSelectedItem(data.id.toString());
                setBuiltInLvls([1, 1]);
                setSelectedOrb(""); setOrbLevel("");
                setSelectedDrifs([]); setDrifTypes({}); setDrifLevels({});
            } else if (data.dragType === "orbs" && zone === "orb") {
                if (!selectedItem || (allowedOrbCategories.length > 0 && !allowedOrbCategories.includes(data.category))) return;
                setOrbType(data.name || data.bonusType);
                setSelectedOrb(data.id.toString());
                setOrbLevel("1");
            } else if (data.dragType === "drifs" && zone.startsWith("drif-")) {
                if (!selectedItem || maxDrifs === 0 || SIZE_INDEX[data.size?.toUpperCase()] > maxDrifIndex) return;
                const idx = parseInt(zone.split('-')[1]);
                if (elementalTypes.includes(data.bonusType) && (slotKey !== "weapon" || hasGlobalElemental)) return;
                setDrifTypes(prev => ({ ...prev, [idx]: data.name || data.bonusType }));
                setSelectedDrifs(prev => { const n = [...prev]; n[idx] = data.id.toString(); return n; });
                setDrifLevels(prev => ({ ...prev, [idx]: 1 }));
            }
        } catch (e) {}
    };

    return {
        selectedItem, setSelectedItem, itemStars, setItemStars, builtInLvls, setBuiltInLvls,
        isEpicOrSet, builtInDrifs, hoverStars, setHoverStars, selectedOrb, setSelectedOrb,
        orbLevel, setOrbLevel, selectedDrifs, setSelectedDrifs, drifTypes, setDrifTypes,
        drifLevels, setDrifLevels, orbType, setOrbType, dragOverZone, groupedOrbs,
        fullSelectedItem, maxDrifs, itemCapacity, currentPowerUsed, isOverCapacity,
        isAtMaxCapacity, capacityPercentage, isSubOrb, availableOrbLevels, handleDragOver,
        handleDragLeave, handleDrop, groupByType
    };
};