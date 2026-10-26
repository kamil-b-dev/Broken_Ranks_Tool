import { getDrifMaxLevel, getOrbMaxLevel } from "../../shared/domain/equipment/equipmentRules";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import {
    calculateCharacterStats,
    clampLevel,
    spentPointCount,
    totalPointsForLevel,
} from "../builder/character/characterDevelopmentDomain";

const DRIF_SIZE_BY_PREFIX = {
    subdrif: "SUBDRIF",
    bidrif: "BIDRIF",
    magnidrif: "MAGNIDRIF",
    arcydrif: "ARCYDRIF",
};

const ITEM_RARITY_BY_TYPE = {
    rar: "RARE",
    rare: "RARE",
    legend: "LEGENDARY",
    legendary: "LEGENDARY",
    epik: "EPIC",
    epic: "EPIC",
    syng: "SET",
    set: "SET",
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const normalizedText = (value) =>
    String(value ?? "")
        .trim()
        .replace(/^["']+|["']+$/g, "")
        .trim()
        .toLocaleLowerCase("pl-PL");

const romanToNumber = (value) => {
    const roman = String(value || "").toUpperCase();
    const values = { I: 1, V: 5, X: 10 };
    let result = 0;
    for (let index = 0; index < roman.length; index += 1) {
        const current = values[roman[index]] || 0;
        const next = values[roman[index + 1]] || 0;
        result += current < next ? -current : current;
    }
    return result;
};

const itemStarsFromOrnaments = (value) => {
    const match = String(value || "")
        .toUpperCase()
        .match(/^([BSG])([1-3])$/);
    if (!match) return 1;
    return { B: 0, S: 3, G: 6 }[match[1]] + Number(match[2]);
};

const slotForItem = (item, occupiedSlots) =>
    SLOTS.find(
        (slot) =>
            !occupiedSlots.has(slot.key) &&
            [slot.cat].flat().includes(String(item.category).toUpperCase())
    )?.key;

const findItem = (equipment, items) => {
    const name = normalizedText(equipment?.Name);
    let candidates = items.filter((item) => normalizedText(item.name) === name);
    if (candidates.length <= 1) return candidates[0] || null;

    const ranked = candidates.filter((item) => romanToNumber(item.tier) === Number(equipment.Rank));
    if (ranked.length) candidates = ranked;
    const rarity = ITEM_RARITY_BY_TYPE[normalizedText(equipment?.Type)];
    if (rarity) {
        const matchingRarity = candidates.filter((item) => item.rarity?.toUpperCase() === rarity);
        if (matchingRarity.length) candidates = matchingRarity;
    }
    return candidates.length === 1 ? candidates[0] : null;
};

const parseDrifIdentity = (entry) => {
    const parts = String(entry?.Name || "")
        .trim()
        .split(/\s+/);
    const size = DRIF_SIZE_BY_PREFIX[normalizedText(parts.shift())];
    return { name: normalizedText(parts.join(" ")), size };
};

const findDrif = (entry, drifs) => {
    const identity = parseDrifIdentity(entry);
    const candidates = drifs.filter(
        (drif) =>
            normalizedText(drif.name) === identity.name &&
            (!identity.size || drif.size?.toUpperCase() === identity.size)
    );
    return candidates.length === 1 ? candidates[0] : null;
};

const findOrb = (entry, orbs) => {
    if (!entry?.Name) return null;
    const name = normalizedText(entry.Name);
    const candidates = orbs.filter((orb) => normalizedText(orb.name) === name);
    return candidates.length === 1 ? candidates[0] : null;
};

const importedLevel = (entry, maximum, stoneLabel) => {
    const rawLevel = entry?.Level;
    if (rawLevel === undefined || rawLevel === null || rawLevel === "") return 1;
    const level = Number(rawLevel);
    if (!Number.isInteger(level) || level < 1 || level > maximum) {
        throw new Error(`Nieprawidłowy poziom ${stoneLabel}: ${rawLevel}.`);
    }
    return level;
};

const parseCharacter = (stats) => {
    const characterStats = {
        Siła: Number(stats.BaseStrength ?? 10),
        Zręczność: Number(stats.BaseDexterity ?? 10),
        Moc: Number(stats.BasePower ?? 10),
        Wiedza: Number(stats.BaseKnowledge ?? 10),
        Inteligencja: Number(stats.BaseIntelligence ?? 10),
        PŻ: Number(stats.BaseHealth ?? 200),
        Mana: Number(stats.BaseMana ?? 200),
        Kondycja: Number(stats.BaseStamina ?? 200),
    };
    const characterConfig = {
        level: Number(stats.Level) || 1,
        spentPoints: {
            Siła: Math.max(0, characterStats["Siła"] - 10),
            Zręczność: Math.max(0, characterStats["Zręczność"] - 10),
            Moc: Math.max(0, characterStats.Moc - 10),
            Wiedza: Math.max(0, characterStats.Wiedza - 10),
            Inteligencja: Math.max(0, characterStats.Inteligencja - 10),
            PŻ: Math.max(0, (characterStats["PŻ"] - 200) / 10),
            Mana: Math.max(0, (characterStats.Mana - 200) / 10),
            Kondycja: Math.max(0, (characterStats.Kondycja - 200) / 10),
        },
    };
    const points = spentPointCount(characterConfig.spentPoints);
    const maximum = totalPointsForLevel(characterConfig.level);
    const derived = calculateCharacterStats(characterConfig.spentPoints);
    const representable =
        clampLevel(characterConfig.level) === characterConfig.level &&
        Object.values(characterConfig.spentPoints).every(Number.isInteger) &&
        points <= maximum &&
        Object.entries(characterStats).every(([name, value]) => derived[name] === value);
    return {
        characterStats,
        // A native character config would be trimmed on import and display different stats.
        characterConfig: representable ? characterConfig : null,
        warnings: representable
            ? []
            : [
                  `Zachowano bazowe statystyki postaci bez rozdziału punktów: nie pasują do zasad rozwoju (poziom ${characterConfig.level}, punkty ${points}/${maximum}).`,
              ],
    };
};

/** Converts a character export produced by the game helper into editor state. */
export const parseGameBuildPayload = (payload, { items = [], orbs = [], drifs = [] }) => {
    if (
        !isObject(payload) ||
        !isObject(payload.stats) ||
        !isObject(payload.equipped) ||
        !Array.isArray(payload.equipmentList)
    ) {
        throw new Error("Plik nie zawiera obsługiwanego eksportu postaci z gry.");
    }

    const equipmentById = new Map(
        payload.equipmentList.map((equipment) => [String(equipment.EqId), equipment])
    );
    if (equipmentById.size !== payload.equipmentList.length) {
        throw new Error("Eksport zawiera powtórzone ID wyposażenia.");
    }
    const equippedEntries = Object.entries(payload.equipped).sort(
        ([left], [right]) => Number(left) - Number(right)
    );
    const slots = {};
    const occupiedSlots = new Set();
    let importedDrifs = 0;
    let skippedDrifs = 0;
    let importedOrbs = 0;
    let skippedOrbs = 0;
    const backpack = [];
    const equippedIds = new Set();
    let importedBackpackDrifs = 0;
    let importedBackpackOrbs = 0;
    let skippedBackpackItems = 0;
    let skippedSkins = 0;

    const parseEquipment = (equipment, item, inBackpack = false) => {
        const drifIds = [];
        const drifLevels = {};
        (equipment.Drifs || []).forEach((entry) => {
            const drif = findDrif(entry, drifs);
            if (!drif) {
                skippedDrifs += 1;
                return;
            }
            const index = drifIds.length;
            drifIds.push(drif.id);
            drifLevels[index] = importedLevel(
                entry,
                getDrifMaxLevel(drif.size),
                `drifa ${drif.name}`
            );
            if (inBackpack) importedBackpackDrifs += 1;
            else importedDrifs += 1;
        });

        const orbIds = [];
        const orbLevels = [];
        (equipment.Orbs || []).forEach((entry) => {
            const orb = findOrb(entry, orbs);
            if (!orb) {
                skippedOrbs += 1;
                return;
            }
            orbIds.push(orb.id);
            orbLevels.push(importedLevel(entry, getOrbMaxLevel(orb.size), `orba ${orb.name}`));
            if (inBackpack) importedBackpackOrbs += 1;
            else importedOrbs += 1;
        });

        return {
            itemId: item.id,
            itemStars: itemStarsFromOrnaments(equipment.Ornaments),
            orbIds,
            orbLevels,
            drifIds,
            drifLevels,
        };
    };

    equippedEntries.forEach(([, equipmentId]) => {
        const equipment = equipmentById.get(String(equipmentId));
        if (!equipment) throw new Error(`Nie znaleziono wyposażenia o ID ${equipmentId}.`);
        if (equippedIds.has(String(equipmentId))) {
            throw new Error(`Ten sam przedmiot o ID ${equipmentId} jest założony więcej niż raz.`);
        }
        equippedIds.add(String(equipmentId));
        const item = findItem(equipment, items);
        if (!item) {
            throw new Error(`Nie znaleziono jednoznacznego odpowiednika: ${equipment.Name}.`);
        }
        const slotKey = slotForItem(item, occupiedSlots);
        if (!slotKey) {
            throw new Error(`Nie udało się przypisać do slotu przedmiotu ${equipment.Name}.`);
        }
        slots[slotKey] = parseEquipment(equipment, item);
        occupiedSlots.add(slotKey);
    });

    payload.equipmentList.forEach((equipment, index) => {
        if (equippedIds.has(String(equipment.EqId))) return;
        if (normalizedText(equipment.Type) === "skin") {
            skippedSkins += 1;
            return;
        }
        const item = findItem(equipment, items);
        if (!item) {
            skippedBackpackItems += 1;
            return;
        }
        backpack.push({
            id: `game-equipment-${index}`,
            kind: "ITEM",
            equipment: parseEquipment(equipment, item, true),
        });
    });

    const character = parseCharacter(payload.stats);
    return {
        requestData: { slots, characterStats: character.characterStats },
        characterConfig: character.characterConfig,
        lockedSlots: [],
        lockedDrifs: {},
        backpack,
        importSummary: {
            importedItems: Object.keys(slots).length,
            importedDrifs,
            skippedDrifs,
            importedOrbs,
            skippedOrbs,
            importedBackpackItems: backpack.length,
            importedBackpackDrifs,
            importedBackpackOrbs,
            skippedBackpackItems,
            skippedSkins,
            warnings: character.warnings,
        },
    };
};
