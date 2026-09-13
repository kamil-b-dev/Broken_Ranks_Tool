const GAME_SLOT_BY_GEAR_TYPE = {
    helmet: "helmet",
    armor: "armor",
    cape: "cape",
    pants: "legs",
    legs: "legs",
    boots: "boots",
    gloves: "gloves",
    belt: "belt",
    bracers: "shield",
    shield: "shield",
    off_hand: "shield",
    amulet: "necklace",
    necklace: "necklace",
};

const ITEM_CATEGORY_BY_GEAR_TYPE = {
    ...GAME_SLOT_BY_GEAR_TYPE,
    pants: "LEGS",
    bracers: "OFF_HAND",
    amulet: "NECKLACE",
    bow: "WEAPON_RANGED",
    weapon_1h: "WEAPON_1H",
    weapon_2h: "WEAPON_2H",
    weapon_ranged: "WEAPON_RANGED",
};

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

const slotForEquipment = (equipment, occupiedSlots) => {
    const gearType = normalizedText(equipment?.GearType);
    if (gearType === "ring") return occupiedSlots.has("ring1") ? "ring2" : "ring1";
    if (["bow", "weapon", "weapon_1h", "weapon_2h", "weapon_ranged"].includes(gearType)) {
        return "weapon";
    }
    return GAME_SLOT_BY_GEAR_TYPE[gearType] || null;
};

const findItem = (equipment, items) => {
    const name = normalizedText(equipment?.Name);
    let candidates = items.filter((item) => normalizedText(item.name) === name);
    if (candidates.length <= 1) return candidates[0] || null;

    const gearType = normalizedText(equipment?.GearType);
    const category = ITEM_CATEGORY_BY_GEAR_TYPE[gearType]?.toUpperCase();
    const ranked = candidates.filter((item) => romanToNumber(item.tier) === Number(equipment.Rank));
    if (ranked.length) candidates = ranked;
    if (category) {
        const categorized = candidates.filter((item) => item.category?.toUpperCase() === category);
        if (categorized.length) candidates = categorized;
    }
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

const parseCharacter = (stats) => {
    const characterStats = {
        Siła: Number(stats.BaseStrength) || 10,
        Zręczność: Number(stats.BaseDexterity) || 10,
        Moc: Number(stats.BasePower) || 10,
        Wiedza: Number(stats.BaseKnowledge) || 10,
        PŻ: Number(stats.BaseHealth) || 200,
        Mana: Number(stats.BaseMana) || 200,
        Kondycja: Number(stats.BaseStamina) || 200,
    };
    return {
        characterStats,
        characterConfig: {
            level: Number(stats.Level) || 1,
            spentPoints: {
                Siła: Math.max(0, characterStats["Siła"] - 10),
                Zręczność: Math.max(0, characterStats["Zręczność"] - 10),
                Moc: Math.max(0, characterStats.Moc - 10),
                Wiedza: Math.max(0, characterStats.Wiedza - 10),
                PŻ: Math.max(0, (characterStats["PŻ"] - 200) / 10),
                Mana: Math.max(0, (characterStats.Mana - 200) / 10),
                Kondycja: Math.max(0, (characterStats.Kondycja - 200) / 10),
            },
        },
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
    const equippedEntries = Object.entries(payload.equipped).sort(
        ([left], [right]) => Number(left) - Number(right)
    );
    const slots = {};
    const occupiedSlots = new Set();
    let importedDrifs = 0;
    let skippedDrifs = 0;
    let importedOrbs = 0;
    let skippedOrbs = 0;

    equippedEntries.forEach(([, equipmentId]) => {
        const equipment = equipmentById.get(String(equipmentId));
        if (!equipment) throw new Error(`Nie znaleziono wyposażenia o ID ${equipmentId}.`);
        const slotKey = slotForEquipment(equipment, occupiedSlots);
        if (!slotKey || occupiedSlots.has(slotKey)) {
            throw new Error(`Nie udało się przypisać do slotu przedmiotu ${equipment.Name}.`);
        }
        const item = findItem(equipment, items);
        if (!item) {
            throw new Error(`Nie znaleziono jednoznacznego odpowiednika: ${equipment.Name}.`);
        }

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
            drifLevels[index] = Number(entry.Level) || 1;
            importedDrifs += 1;
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
            orbLevels.push(Math.max(1, Math.min(3, Number(entry.Level) || 1)));
            importedOrbs += 1;
        });

        slots[slotKey] = {
            itemId: item.id,
            itemStars: itemStarsFromOrnaments(equipment.Ornaments),
            orbIds,
            orbLevels,
            drifIds,
            drifLevels,
        };
        occupiedSlots.add(slotKey);
    });

    const character = parseCharacter(payload.stats);
    return {
        requestData: { slots, characterStats: character.characterStats },
        characterConfig: character.characterConfig,
        lockedSlots: [],
        lockedDrifs: {},
        importSummary: {
            importedItems: Object.keys(slots).length,
            importedDrifs,
            skippedDrifs,
            importedOrbs,
            skippedOrbs,
        },
    };
};
