import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots.js";

const items = SLOTS.map((slot, index) => ({
    id: index + 1,
    name: `${slot.label} podróżnika`,
    category: Array.isArray(slot.cat)
        ? slot.cat[0] === "SHIELD"
            ? "OFF_HAND"
            : slot.cat[0]
        : slot.cat,
    tier: "X",
    rarity: "RARE",
    capacity: 12,
    stats: { Siła: 5 },
}));
export const builderCatalog = {
    items,
    orbs: [
        { id: 50, name: "Ochrona", bonusType: "DEFENSE", category: "DEFENSIVE", size: "SUBORB" },
    ],
    drifs: [
        {
            id: 60,
            name: "Band",
            bonusType: "CRITICAL_CHANCE",
            size: "SUBDRIF",
            category: "OFFENSIVE",
        },
    ],
    gameRules: {
        slotOrbRules: { helmet: ["DEFENSIVE"] },
        elementalTypes: ["DAMAGE_FIRE", "DAMAGE_ENERGY", "DAMAGE_FROST"],
        drifBasePowers: { CRITICAL_CHANCE: 4 },
        epicBuiltInDrifs: {},
        bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk" },
        drifMaxCaps: { CRITICAL_CHANCE: 60 },
    },
    dictionaries: { itemCategories: {}, drifCategories: {}, orbCategories: {} },
};
