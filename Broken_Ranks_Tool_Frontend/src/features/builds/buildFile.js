import { parseGameBuildPayload } from "./gameBuildFile";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import {
    ROMAN_TO_INT,
    SIZE_INDEX,
    getDrifMaxLevel,
    getOrbMaxLevel,
} from "../../shared/domain/equipment/equipmentRules";
import {
    normalizeCharacterConfig,
    totalPointsForLevel,
    trimSpentPoints,
} from "../builder/character/characterDevelopmentDomain";

export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
export const BUILD_FILE_VERSION = 1;
export const MAX_BUILD_FILE_SIZE = 5 * 1024 * 1024;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const SLOT_BY_KEY = new Map(SLOTS.map((slot) => [slot.key, slot]));
const CHARACTER_STAT_MAX = 50_000;
const ORB_SIZE_INDEX = { SUBORB: 0, BIORB: 1, MAGNIORB: 2, ARCYORB: 3 };

const maximumSizeIndex = (tier) => (tier >= 10 ? 3 : tier >= 7 ? 2 : tier >= 4 ? 1 : 0);

const maximumDrifSlots = (tier, stars) => {
    const base = tier >= 10 ? 3 : tier >= 4 ? 2 : 1;
    return base + ((tier === 2 || tier === 3) && stars >= 7 ? 1 : 0);
};

const drifPowerMultiplier = (level) => (level <= 6 ? 1 : level <= 11 ? 2 : level <= 16 ? 3 : 4);

const itemFitsSlot = (item, slotDefinition) => {
    if (!item.category) return true;
    const allowed = Array.isArray(slotDefinition.cat) ? slotDefinition.cat : [slotDefinition.cat];
    return allowed.includes(String(item.category).toUpperCase());
};

const validateBuiltInDrifs = (item, drifIds, drifsById, gameRules, slotKey) => {
    const baseItemName = item?.name?.replace(/\s+[IVX]+$/, "").trim() || "";
    const expectedTypes = gameRules.epicBuiltInDrifs?.[baseItemName] || [];
    const importedDrifs = drifIds.filter(Boolean).map((id) => drifsById.get(String(id)));
    const matches =
        importedDrifs.length === expectedTypes.length &&
        importedDrifs.every(
            (drif, index) =>
                String(drif?.size).toUpperCase() === "MAGNIDRIF" &&
                drif?.bonusType === expectedTypes[index]
        );
    if (!matches) {
        throw new Error(`Wbudowane drify nie pasują do przedmiotu w slocie ${slotKey}.`);
    }
};

const normalizeImportedCharacterConfig = (config) => {
    if (!isObject(config)) return null;
    const normalized = normalizeCharacterConfig(config);
    return {
        ...normalized,
        spentPoints: trimSpentPoints(normalized.spentPoints, totalPointsForLevel(normalized.level)),
    };
};

const requireIntegerInRange = (value, minimum, maximum, message) => {
    if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(message);
};

const validateLevels = (levels, ids, resourcesById, maximumLevel, message) => {
    if (levels == null) return;
    if (!isObject(levels) && !Array.isArray(levels)) throw new Error(message);
    Object.entries(levels).forEach(([indexKey, level]) => {
        const index = Number(indexKey);
        if (!Number.isInteger(index) || index < 0 || index >= ids.length || !ids[index]) {
            throw new Error(message);
        }
        const resource = resourcesById.get(String(ids[index]));
        requireIntegerInRange(Number(level), 1, maximumLevel(resource?.size), message);
    });
};

const validateCharacterStats = (stats) => {
    if (stats == null) return;
    if (!isObject(stats)) throw new Error("Build zawiera niepoprawne statystyki postaci.");
    Object.values(stats).forEach((value) =>
        requireIntegerInRange(
            value,
            0,
            CHARACTER_STAT_MAX,
            "Statystyki postaci muszą być liczbami całkowitymi od 0 do 50000."
        )
    );
};

const validateKnownIds = (ids, knownIds, message) => {
    if (ids == null) return;
    if (!Array.isArray(ids)) throw new Error(message);

    ids.filter(Boolean).forEach((id) => {
        if (!knownIds.has(String(id))) throw new Error(message);
    });
};

/**
 * Creates the versioned file payload used by the build export action.
 * @param {object} build Current build state.
 * @returns {object} Serializable build payload.
 */
export const createBuildPayload = ({ requestData, characterConfig, lockedSlots, lockedDrifs }) => ({
    format: BUILD_FILE_FORMAT,
    version: BUILD_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    build: {
        requestData,
        characterConfig,
        lockedSlots,
        lockedDrifs,
    },
});

/** Downloads a serialized build payload and releases the temporary browser URL. */
export const downloadBuildPayload = (payload, date = new Date()) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `broken-ranks-build-${date.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Reads and validates an exported build against currently available game data.
 * @param {File} file Build file selected by the user.
 * @param {object} data Current item, orb, and drif collections.
 * @returns {Promise<object>} Validated state ready for React state updates.
 * @throws {Error} If the file is invalid or references unknown templates.
 */
export const parseBuildFile = async (file, data = {}) => {
    const { items = [], orbs = [], drifs = [] } = data;
    if (!file) throw new Error("Nie wybrano pliku buildu.");
    if (file.size > MAX_BUILD_FILE_SIZE) throw new Error("Plik buildu jest zbyt duży.");

    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch {
        throw new Error("Plik nie zawiera poprawnego JSON-a.");
    }

    if (payload?.format === BUILD_FILE_FORMAT) {
        return parseBuildPayload(payload, data);
    }
    if (payload?.stats && payload?.equipped && payload?.equipmentList) {
        return parseGameBuildPayload(payload, { items, orbs, drifs });
    }
    return parseBuildPayload(payload, data);
};

/**
 * Validates an in-memory build payload against currently available game data.
 * Used by both JSON imports and the local build library.
 */
export const parseBuildPayload = (
    payload,
    { items = [], orbs = [], drifs = [], gameRules = {} }
) => {
    if (payload?.format !== BUILD_FILE_FORMAT || payload?.version !== BUILD_FILE_VERSION) {
        throw new Error("Nieobsługiwany format lub wersja pliku buildu.");
    }

    const build = payload.build;
    const importedRequest = build?.requestData;
    if (!isObject(importedRequest) || !isObject(importedRequest.slots)) {
        throw new Error("Plik nie zawiera poprawnej konfiguracji slotów.");
    }

    const knownItems = new Set(items.map((item) => String(item.id)));
    const knownOrbs = new Set(orbs.map((orb) => String(orb.id)));
    const knownDrifs = new Set(drifs.map((drif) => String(drif.id)));
    const itemsById = new Map(items.map((item) => [String(item.id), item]));
    const orbsById = new Map(orbs.map((orb) => [String(orb.id), orb]));
    const drifsById = new Map(drifs.map((drif) => [String(drif.id), drif]));
    const usedOrbTypes = new Set();

    Object.entries(importedRequest.slots).forEach(([slotKey, slot]) => {
        const slotDefinition = SLOT_BY_KEY.get(slotKey);
        if (!slotDefinition) throw new Error(`Build zawiera nieznany slot ${slotKey}.`);
        if (!isObject(slot)) throw new Error(`Niepoprawne dane slota ${slotKey}.`);
        if (slot.itemId != null && !knownItems.has(String(slot.itemId))) {
            throw new Error(`Build odwołuje się do nieznanego przedmiotu w slocie ${slotKey}.`);
        }
        const item = slot.itemId == null ? null : itemsById.get(String(slot.itemId));
        if (!item && [slot.orbIds, slot.drifIds].some((ids) => ids?.some(Boolean))) {
            throw new Error(`Pusty slot ${slotKey} nie może zawierać kamieni.`);
        }
        if (item && !itemFitsSlot(item, slotDefinition)) {
            throw new Error(`Przedmiot w slocie ${slotKey} nie pasuje do tego slotu.`);
        }
        requireIntegerInRange(
            slot.itemStars ?? 1,
            1,
            9,
            `Niepoprawna liczba gwiazdek w slocie ${slotKey}.`
        );
        validateKnownIds(
            slot.orbIds,
            knownOrbs,
            `Build zawiera nieznane orby w slocie ${slotKey}.`
        );
        validateKnownIds(
            slot.drifIds,
            knownDrifs,
            `Build zawiera nieznane drify w slocie ${slotKey}.`
        );
        const orbIds = slot.orbIds || [];
        const drifIds = slot.drifIds || [];
        const stars = slot.itemStars ?? 1;
        const tier = ROMAN_TO_INT[String(item?.tier).toUpperCase()] || 0;
        const rarity = String(item?.rarity).toUpperCase();
        const maximumOrbCount = String(item?.rarity).toUpperCase() === "LEGENDARY" ? 2 : 1;
        if (
            orbIds.length > maximumOrbCount ||
            orbIds.some((id, index) => !id && orbIds[index + 1])
        ) {
            throw new Error(`Niepoprawne rozmieszczenie orbów w slocie ${slotKey}.`);
        }
        validateLevels(
            slot.orbLevels,
            orbIds,
            orbsById,
            (size) => getOrbMaxLevel(size),
            `Niepoprawne poziomy orbów w slocie ${slotKey}.`
        );
        validateLevels(
            slot.drifLevels,
            drifIds,
            drifsById,
            (size) => getDrifMaxLevel(size),
            `Niepoprawne poziomy drifów w slocie ${slotKey}.`
        );
        orbIds.filter(Boolean).forEach((id, index) => {
            const orb = orbsById.get(String(id));
            const allowedCategories = gameRules.slotOrbRules?.[slotKey] || [];
            const allowedCategory =
                index === 1
                    ? orb?.category === "OFFENSIVE" && rarity === "LEGENDARY"
                    : allowedCategories.includes(orb?.category) ||
                      (rarity === "LEGENDARY" && orb?.category === "OFFENSIVE");
            if (allowedCategories.length > 0 && !allowedCategory) {
                throw new Error(`Orb w slocie ${slotKey} ma niedozwoloną kategorię.`);
            }
            if ((ORB_SIZE_INDEX[String(orb?.size).toUpperCase()] ?? -1) > maximumSizeIndex(tier)) {
                throw new Error(`Orb w slocie ${slotKey} jest zbyt duży.`);
            }
        });
        if (["EPIC", "SET"].includes(rarity)) {
            validateBuiltInDrifs(item, drifIds, drifsById, gameRules, slotKey);
        } else {
            const populatedDrifs = drifIds.filter(Boolean);
            if (populatedDrifs.length > maximumDrifSlots(tier, stars)) {
                throw new Error(`Za dużo drifów w slocie ${slotKey}.`);
            }
            populatedDrifs.forEach((id) => {
                const drif = drifsById.get(String(id));
                if ((SIZE_INDEX[String(drif?.size).toUpperCase()] ?? -1) > maximumSizeIndex(tier)) {
                    throw new Error(`Drif w slocie ${slotKey} jest zbyt duży.`);
                }
            });
            if (gameRules.drifBasePowers && Number(item?.capacity) >= 0) {
                const starCapacityBonus = stars >= 9 ? 4 : stars >= 8 ? 2 : stars >= 7 ? 1 : 0;
                const capacity = Number(item.capacity) || 0;
                const availableCapacity = capacity === 0 ? 0 : capacity + starCapacityBonus;
                const usedCapacity = drifIds.reduce((sum, id, index) => {
                    if (!id) return sum;
                    const drif = drifsById.get(String(id));
                    const level = Number(slot.drifLevels?.[index]) || 1;
                    return (
                        sum +
                        (Number(gameRules.drifBasePowers[drif?.bonusType]) || 0) *
                            drifPowerMultiplier(level)
                    );
                }, 0);
                if (usedCapacity > availableCapacity) {
                    throw new Error(`Drify przekraczają pojemność przedmiotu w slocie ${slotKey}.`);
                }
            }
        }
        const drifTypes = drifIds
            .filter(Boolean)
            .map((id) => drifsById.get(String(id))?.bonusType)
            .filter(Boolean);
        if (new Set(drifTypes).size !== drifTypes.length) {
            throw new Error(`Build powtarza typ drifa w slocie ${slotKey}.`);
        }
        const elementalTypes = gameRules.elementalTypes || [];
        const elementalCount = drifTypes.filter((type) => elementalTypes.includes(type)).length;
        if (elementalCount > 0 && (slotKey !== "weapon" || elementalCount > 1)) {
            throw new Error(`Niepoprawne rozmieszczenie drifa żywiołowego w slocie ${slotKey}.`);
        }
        orbIds.filter(Boolean).forEach((id) => {
            const type = orbsById.get(String(id))?.bonusType;
            if (type && usedOrbTypes.has(type)) {
                throw new Error(`Build powtarza typ orba ${type}.`);
            }
            if (type) usedOrbTypes.add(type);
        });
    });

    validateCharacterStats(importedRequest.characterStats);

    const lockedSlots = Array.isArray(build.lockedSlots) ? build.lockedSlots : [];
    lockedSlots.forEach((slotKey) => {
        if (!SLOT_BY_KEY.has(slotKey) || !importedRequest.slots[slotKey]?.itemId) {
            throw new Error(`Niepoprawna blokada slota ${slotKey}.`);
        }
    });
    const lockedDrifs = isObject(build.lockedDrifs) ? build.lockedDrifs : {};
    Object.entries(lockedDrifs).forEach(([slotKey, indices]) => {
        const drifIds = importedRequest.slots[slotKey]?.drifIds;
        if (!Array.isArray(indices) || !Array.isArray(drifIds)) {
            throw new Error(`Niepoprawne blokady drifów w slocie ${slotKey}.`);
        }
        indices.forEach((index) => {
            if (!Number.isInteger(index) || index < 0 || !drifIds[index]) {
                throw new Error(`Niepoprawna blokada drifa w slocie ${slotKey}.`);
            }
        });
    });

    return {
        requestData: cloneJson({
            slots: importedRequest.slots,
            characterStats: importedRequest.characterStats || {},
        }),
        characterConfig: normalizeImportedCharacterConfig(build.characterConfig),
        lockedSlots: [...lockedSlots],
        lockedDrifs: cloneJson(lockedDrifs),
    };
};
