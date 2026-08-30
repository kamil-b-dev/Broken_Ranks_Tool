import { useState, useEffect, useMemo } from "react";
import { ROMAN_TO_INT } from "../utils/GearRules";
import { useGearSlotDragDrop } from "./useGearSlotDragDrop";
import {
    calculateItemCapacity,
    calculateMaximumDrifSizeIndex,
    calculateMaximumDrifSlots,
    calculateUsedDrifPower,
    createImportedGearSlotState,
    collectUsedOrbTypes,
    getAvailablePrimaryOrbs,
    getAvailableSecondaryOrbs,
    groupGearOptionsByType,
    hasElementalDrifInOtherSlot,
} from "../components/gear_slot/gearSlotDomain";

/**
 * Manages state and business rules for a single equipment slot.
 * Handles item, orb, and drif selection, capacity checks, and drag-and-drop state.
 *
 * @param {object} props Hook configuration.
 * @param {string} props.slotKey Equipment slot identifier.
 * @param {Array<object>} props.items Items available for the slot.
 * @param {Array<object>} props.orbs Available orb templates.
 * @param {Array<object>} props.drifs Available drif templates.
 * @param {object} props.allSlots Current state of all equipment slots.
 * @param {object} props.gameRules Game rules used for slot and elemental restrictions.
 * @param {function} props.onUpdate Callback for publishing slot changes.
 * @param {*} props.optimizationTrigger Value used to synchronize optimizer results.
 * @returns {object} Slot state, derived values, and event handlers for GearSlot.
 */
export const useGearSlot = ({
    slotKey,
    items,
    orbs,
    drifs,
    allSlots,
    gameRules,
    onUpdate,
    optimizationTrigger,
}) => {
    const {
        slotOrbRules = {},
        elementalTypes = [],
        drifBasePowers = {},
        epicBuiltInDrifs = {},
        bonusTranslations = {},
    } = gameRules || {};

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

    const fullSelectedItem = useMemo(
        () => items.find((i) => i.id.toString() === selectedItem.toString()),
        [items, selectedItem]
    );
    const tierVal = fullSelectedItem ? ROMAN_TO_INT[fullSelectedItem.tier] || 0 : 0;
    const isLegendary = fullSelectedItem?.rarity?.toUpperCase() === "LEGENDARY";
    const isEpicOrSet =
        fullSelectedItem && ["EPIC", "SET"].includes(fullSelectedItem.rarity?.toUpperCase());

    useEffect(() => {
        const externalData = allSlots[slotKey];
        if (!externalData && Object.keys(allSlots || {}).length === 0) return;
        const imported = createImportedGearSlotState(externalData, orbs, drifs);
        setSelectedItem(imported.selectedItem);
        setItemStars(imported.itemStars);
        setOrbSlots(imported.orbSlots);
        setSelectedDrifs(imported.selectedDrifs);
        setDrifTypes(imported.drifTypes);
        setDrifLevels(imported.drifLevels);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optimizationTrigger, drifs, orbs]);

    const builtInDrifs = useMemo(() => {
        if (!isEpicOrSet) return [];
        const baseItemName = fullSelectedItem?.name?.replace(/\s+[IVX]+$/, "").trim();
        const bonusTypes = epicBuiltInDrifs[baseItemName] || [];

        return bonusTypes.map((bonusType) => {
            const foundDrif = drifs.find(
                (d) => d.size?.toUpperCase() === "MAGNIDRIF" && d.bonusType === bonusType
            );
            return {
                id: foundDrif ? foundDrif.id : null,
                bonusType: bonusType,
                displayName: bonusTranslations?.[bonusType] || bonusType,
            };
        });
    }, [isEpicOrSet, fullSelectedItem?.name, epicBuiltInDrifs, drifs, bonusTranslations]);

    const globalUsedOrbs = useMemo(
        () => collectUsedOrbTypes(allSlots, slotKey, orbs),
        [allSlots, slotKey, orbs]
    );

    const allowedOrbCategories = useMemo(
        () => slotOrbRules[slotKey] || [],
        [slotOrbRules, slotKey]
    );

    const availableOrbs1 = useMemo(
        () =>
            getAvailablePrimaryOrbs({
                orbs,
                allowedCategories: allowedOrbCategories,
                usedTypes: globalUsedOrbs,
                itemTier: tierVal,
                isLegendary,
                tierToNumber: ROMAN_TO_INT,
            }),
        [orbs, globalUsedOrbs, allowedOrbCategories, tierVal, isLegendary]
    );

    const availableOrbs2 = useMemo(
        () =>
            getAvailableSecondaryOrbs({
                orbs,
                usedTypes: globalUsedOrbs,
                itemTier: tierVal,
                isLegendary,
                primaryOrbId: orbSlots.orb1.id,
                tierToNumber: ROMAN_TO_INT,
            }),
        [orbs, globalUsedOrbs, tierVal, isLegendary, orbSlots.orb1.id]
    );

    const groupedOrbs1 = useMemo(() => groupGearOptionsByType(availableOrbs1), [availableOrbs1]);
    const groupedOrbs2 = useMemo(() => groupGearOptionsByType(availableOrbs2), [availableOrbs2]);

    const hasGlobalElemental = useMemo(
        () =>
            hasElementalDrifInOtherSlot({
                allSlots,
                currentSlotKey: slotKey,
                drifs,
                elementalTypes,
            }),
        [allSlots, slotKey, drifs, elementalTypes]
    );

    const maxDrifs = useMemo(
        () =>
            calculateMaximumDrifSlots({
                hasItem: Boolean(fullSelectedItem),
                isEpicOrSet,
                tier: tierVal,
                stars: itemStars,
            }),
        [fullSelectedItem, tierVal, itemStars, isEpicOrSet]
    );

    const maxDrifIndex = useMemo(
        () =>
            calculateMaximumDrifSizeIndex({
                hasItem: Boolean(fullSelectedItem),
                isEpicOrSet,
                tier: tierVal,
            }),
        [tierVal, fullSelectedItem, isEpicOrSet]
    );

    const itemCapacity = useMemo(
        () => calculateItemCapacity(fullSelectedItem, itemStars),
        [fullSelectedItem, itemStars]
    );

    const currentPowerUsed = useMemo(
        () =>
            calculateUsedDrifPower({
                selectedDrifs,
                drifs,
                basePowers: drifBasePowers,
                levels: drifLevels,
            }),
        [selectedDrifs, drifs, drifBasePowers, drifLevels]
    );

    const isOverCapacity = currentPowerUsed > itemCapacity;
    const isAtMaxCapacity = currentPowerUsed === itemCapacity && itemCapacity > 0;
    const capacityPercentage =
        itemCapacity > 0 ? Math.min((currentPowerUsed / itemCapacity) * 100, 100) : 0;

    useEffect(() => {
        const allDrifIds = [];
        const validDrifLevels = {};

        for (let i = 0; i < maxDrifs; i++) {
            allDrifIds.push(selectedDrifs[i] || "");
            if (drifLevels[i]) validDrifLevels[i] = drifLevels[i];
        }

        builtInDrifs.forEach((bDrif, idx) => {
            if (bDrif.id) {
                const appendedIndex = allDrifIds.length;
                allDrifIds.push(parseInt(bDrif.id));
                validDrifLevels[appendedIndex] = builtInLvls[idx] || 1;
            }
        });

        const orbIds = [orbSlots.orb1.id, isLegendary ? orbSlots.orb2.id : null].filter(Boolean);
        const orbLevels = [orbSlots.orb1.level, isLegendary ? orbSlots.orb2.level : null]
            .filter(Boolean)
            .map((l) => parseInt(l));

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            itemStars: itemStars,
            orbIds: orbIds,
            orbLevels: orbLevels,
            drifIds: allDrifIds,
            drifLevels: validDrifLevels,
        });
    }, [
        selectedItem,
        itemStars,
        orbSlots,
        isLegendary,
        selectedDrifs,
        drifLevels,
        maxDrifs,
        builtInLvls,
        builtInDrifs,
        slotKey,
        onUpdate,
    ]);

    const { dragOverZone, handleDragOver, handleDragLeave, handleDrop } = useGearSlotDragDrop({
        selectedItem,
        slotKey,
        availableOrbs1,
        availableOrbs2,
        maxDrifs,
        maxDrifIndex,
        elementalTypes,
        hasGlobalElemental,
        setSelectedItem,
        setBuiltInLvls,
        setOrbSlots,
        setSelectedDrifs,
        setDrifTypes,
        setDrifLevels,
    });

    return {
        selectedItem,
        setSelectedItem,
        itemStars,
        setItemStars,
        builtInLvls,
        setBuiltInLvls,
        isEpicOrSet,
        isLegendary,
        builtInDrifs,
        hoverStars,
        setHoverStars,
        orbSlots,
        setOrbSlots,
        selectedDrifs,
        setSelectedDrifs,
        drifTypes,
        setDrifTypes,
        drifLevels,
        setDrifLevels,
        dragOverZone,
        groupedOrbs1,
        groupedOrbs2,
        fullSelectedItem,
        maxDrifs,
        maxDrifIndex,
        itemCapacity,
        currentPowerUsed,
        isOverCapacity,
        isAtMaxCapacity,
        capacityPercentage,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        groupByType: groupGearOptionsByType,
    };
};
