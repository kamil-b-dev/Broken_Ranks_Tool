import { getEffectiveDrifMultiplier } from "../../../shared/domain/equipment/equipmentRules";
export {
    getEffectiveDrifMultiplier,
    calculateMaximumDrifSlots,
    calculateMaximumDrifSizeIndex,
    calculateMaximumOrbSizeIndex,
    calculateItemCapacity,
} from "../../../shared/domain/equipment/equipmentRules";

const ORB_SIZE_INDEX = { SUBORB: 0, BIORB: 1, MAGNIORB: 2, ARCYORB: 3 };

/** Groups selectable game resources by their user-facing type. */
export const groupGearOptionsByType = (items) => {
    if (!Array.isArray(items)) return {};
    return items.reduce((groups, item) => {
        const type = item.name || item.description || item.bonusType;
        if (!type) return groups;
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
        return groups;
    }, {});
};

export const calculateUsedDrifPower = ({ selectedDrifs, drifs, basePowers, levels }) =>
    selectedDrifs.reduce((total, drifId, index) => {
        if (!drifId) return total;
        const drif = drifs.find((candidate) => String(candidate.id) === String(drifId));
        if (!drif) return total;
        const basePower = basePowers[drif.bonusType] || 0;
        return total + basePower * getEffectiveDrifMultiplier(levels[index]);
    }, 0);

const emptyOrb = () => ({ id: "", level: "", type: "" });

/** Converts persisted slot data into the local editor state used by useGearSlot. */
export const createImportedGearSlotState = (slot, orbs, drifs, builtInDrifCount = 0) => {
    if (!slot) {
        return {
            selectedItem: "",
            itemStars: 1,
            orbSlots: { orb1: emptyOrb(), orb2: emptyOrb() },
            selectedDrifs: [],
            drifTypes: {},
            drifLevels: {},
            builtInLvls: [1, 1],
        };
    }

    const orbIds = slot.orbIds || [];
    const orbLevels = slot.orbLevels || [];
    const toOrbState = (index) => {
        const id = orbIds[index];
        const orb = id ? orbs.find((candidate) => String(candidate.id) === String(id)) : null;
        return {
            id: id == null ? "" : String(id),
            level: id == null ? "" : String(orbLevels[index] || 1),
            type: orb?.name || orb?.bonusType || "",
        };
    };

    const selectedDrifs = [];
    const drifTypes = {};
    const drifLevels = {};
    (slot.drifIds || []).forEach((id, index) => {
        if (!id) {
            selectedDrifs[index] = "";
            return;
        }
        selectedDrifs[index] = String(id);
        const drif = drifs.find((candidate) => String(candidate.id) === String(id));
        if (drif) drifTypes[index] = drif.name || drif.description || drif.bonusType;
        drifLevels[index] = slot.drifLevels?.[index] ? Number.parseInt(slot.drifLevels[index]) : 1;
    });

    const builtInStartIndex = Math.max(0, selectedDrifs.length - builtInDrifCount);
    const builtInLvls = [0, 1].map((index) => {
        if (index >= builtInDrifCount) return 1;
        return Number.parseInt(slot.drifLevels?.[builtInStartIndex + index]) || 1;
    });

    return {
        selectedItem: slot.itemId == null ? "" : String(slot.itemId),
        itemStars: Number(slot.itemStars) || 1,
        orbSlots: { orb1: toOrbState(0), orb2: toOrbState(1) },
        selectedDrifs,
        drifTypes,
        drifLevels,
        builtInLvls,
    };
};

export const getBuiltInDrifBonusTypes = (item, epicBuiltInDrifs = {}) => {
    const rarity = item?.rarity?.toUpperCase();
    if (!item || !["EPIC", "SET"].includes(rarity)) return [];
    const baseItemName = item.name?.replace(/\s+[IVX]+$/, "").trim();
    return epicBuiltInDrifs[baseItemName] || [];
};

export const createBuiltInDrifs = ({ item, epicBuiltInDrifs, drifs, bonusTranslations }) =>
    getBuiltInDrifBonusTypes(item, epicBuiltInDrifs).map((bonusType) => {
        const foundDrif = drifs.find(
            (drif) => drif.size?.toUpperCase() === "MAGNIDRIF" && drif.bonusType === bonusType
        );
        return {
            id: foundDrif?.id ?? null,
            bonusType,
            displayName: bonusTranslations?.[bonusType] || bonusType,
        };
    });

export const createGearSlotUpdate = ({
    selectedItem,
    itemStars,
    orbSlots,
    isLegendary,
    selectedDrifs,
    drifLevels,
    maxDrifs,
    builtInDrifs,
    builtInLvls,
}) => {
    if (!selectedItem) {
        return { itemId: null, itemStars, orbIds: [], orbLevels: [], drifIds: [], drifLevels: {} };
    }
    const drifIds = [];
    const publishedDrifLevels = {};

    for (let index = 0; index < maxDrifs; index += 1) {
        drifIds.push(selectedDrifs[index] || "");
        if (selectedDrifs[index] && drifLevels[index]) {
            publishedDrifLevels[index] = drifLevels[index];
        }
    }

    builtInDrifs.forEach((drif, index) => {
        if (!drif.id) return;
        const appendedIndex = drifIds.length;
        drifIds.push(Number.parseInt(drif.id));
        publishedDrifLevels[appendedIndex] = builtInLvls[index] || 1;
    });

    const selectedOrbs = [orbSlots.orb1, isLegendary ? orbSlots.orb2 : null].filter(
        (orb) => orb?.id
    );

    return {
        itemId: selectedItem || null,
        itemStars,
        orbIds: selectedOrbs.map((orb) => orb.id),
        orbLevels: selectedOrbs.map((orb) =>
            orb.level === "" || orb.level == null ? 1 : Number.parseInt(orb.level)
        ),
        drifIds,
        drifLevels: publishedDrifLevels,
    };
};

export const collectUsedOrbTypes = (allSlots, currentSlotKey, orbs) =>
    Object.entries(allSlots || {})
        .filter(([slotKey, slot]) => slotKey !== currentSlotKey && slot?.orbIds)
        .flatMap(([, slot]) => slot.orbIds)
        .filter(Boolean)
        .map((orbId) => orbs.find((orb) => String(orb.id) === String(orbId))?.bonusType)
        .filter(Boolean);

export const getAvailablePrimaryOrbs = ({
    orbs,
    allowedCategories,
    usedTypes,
    isLegendary,
    maximumSizeIndex,
    secondaryOrbId,
}) =>
    orbs.filter((orb) => {
        const secondaryType = orbs.find(
            (candidate) => String(candidate.id) === String(secondaryOrbId)
        )?.bonusType;
        const orbSizeIndex = ORB_SIZE_INDEX[String(orb.size).toUpperCase()] ?? -1;
        const allowed =
            allowedCategories.includes(orb.category) ||
            (isLegendary && orb.category === "OFFENSIVE");
        return (
            allowed &&
            !usedTypes.includes(orb.bonusType) &&
            orb.bonusType !== secondaryType &&
            orbSizeIndex >= 0 &&
            orbSizeIndex <= maximumSizeIndex
        );
    });

export const getAvailableSecondaryOrbs = ({
    orbs,
    usedTypes,
    maximumSizeIndex,
    isLegendary,
    primaryOrbId,
}) => {
    if (!isLegendary) return [];
    const primaryType = orbs.find((orb) => String(orb.id) === String(primaryOrbId))?.bonusType;
    return orbs.filter((orb) => {
        const orbSizeIndex = ORB_SIZE_INDEX[String(orb.size).toUpperCase()] ?? -1;
        return (
            orb.category === "OFFENSIVE" &&
            !usedTypes.includes(orb.bonusType) &&
            orb.bonusType !== primaryType &&
            orbSizeIndex >= 0 &&
            orbSizeIndex <= maximumSizeIndex
        );
    });
};
