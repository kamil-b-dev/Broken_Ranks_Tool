import { useMemo } from "react";
import { ROMAN_TO_INT } from "../../../shared/domain/equipment/equipmentRules";
import {
    calculateItemCapacity,
    calculateMaximumDrifSizeIndex,
    calculateMaximumDrifSlots,
    calculateUsedDrifPower,
    collectUsedOrbTypes,
    createBuiltInDrifs,
    getAvailablePrimaryOrbs,
    getAvailableSecondaryOrbs,
    groupGearOptionsByType,
    hasElementalDrifInOtherSlot,
} from "./gearSlotDomain";

/** Derives catalog choices, restrictions, and capacity state for an editable gear slot. */
export const useGearSlotDerivedState = ({
    slotKey,
    items,
    orbs,
    drifs,
    allSlots,
    gameRules,
    selectedItem,
    itemStars,
    orbSlots,
    selectedDrifs,
    drifLevels,
}) => {
    const {
        slotOrbRules = {},
        elementalTypes = [],
        drifBasePowers = {},
        epicBuiltInDrifs = {},
        bonusTranslations = {},
    } = gameRules || {};

    const fullSelectedItem = useMemo(
        () => items.find((item) => String(item.id) === String(selectedItem)),
        [items, selectedItem]
    );
    const tier = fullSelectedItem ? ROMAN_TO_INT[fullSelectedItem.tier] || 0 : 0;
    const isLegendary = fullSelectedItem?.rarity?.toUpperCase() === "LEGENDARY";
    const isEpicOrSet =
        fullSelectedItem && ["EPIC", "SET"].includes(fullSelectedItem.rarity?.toUpperCase());

    const builtInDrifs = useMemo(
        () =>
            createBuiltInDrifs({
                item: fullSelectedItem,
                epicBuiltInDrifs,
                drifs,
                bonusTranslations,
            }),
        [fullSelectedItem, epicBuiltInDrifs, drifs, bonusTranslations]
    );
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
                itemTier: tier,
                isLegendary,
                tierToNumber: ROMAN_TO_INT,
            }),
        [orbs, globalUsedOrbs, allowedOrbCategories, tier, isLegendary]
    );
    const availableOrbs2 = useMemo(
        () =>
            getAvailableSecondaryOrbs({
                orbs,
                usedTypes: globalUsedOrbs,
                itemTier: tier,
                isLegendary,
                primaryOrbId: orbSlots.orb1.id,
                tierToNumber: ROMAN_TO_INT,
            }),
        [orbs, globalUsedOrbs, tier, isLegendary, orbSlots.orb1.id]
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
                tier,
                stars: itemStars,
            }),
        [fullSelectedItem, tier, itemStars, isEpicOrSet]
    );
    const maxDrifIndex = useMemo(
        () =>
            calculateMaximumDrifSizeIndex({
                hasItem: Boolean(fullSelectedItem),
                isEpicOrSet,
                tier,
            }),
        [tier, fullSelectedItem, isEpicOrSet]
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

    return {
        elementalTypes,
        fullSelectedItem,
        isLegendary,
        isEpicOrSet,
        builtInDrifs,
        availableOrbs1,
        availableOrbs2,
        groupedOrbs1,
        groupedOrbs2,
        hasGlobalElemental,
        maxDrifs,
        maxDrifIndex,
        itemCapacity,
        currentPowerUsed,
        isOverCapacity: currentPowerUsed > itemCapacity,
        isAtMaxCapacity: currentPowerUsed === itemCapacity && itemCapacity > 0,
        capacityPercentage:
            itemCapacity > 0 ? Math.min((currentPowerUsed / itemCapacity) * 100, 100) : 0,
        groupByType: groupGearOptionsByType,
    };
};
