export const reportData = {
    items: [
        { id: 100, name: "Żmij", rarity: "EPIC" },
        { id: 101, name: "Żmij", rarity: "LEGENDARY" },
    ],
    drifs: [{ id: 1, name: "Band", size: "MAGNIDRIF" }],
    orbs: [
        { id: 11, name: "Czuf", size: "MAGNIORB" },
        { id: 12, name: "Czuf", size: "ARCYORB" },
    ],
    gameRules: { bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk" } },
};
export const position = { slot: "weapon", socketIndex: 0 };
export const orb = (type, from, to, overrides = {}) => ({
    type,
    instanceId: "orb:internal",
    templateId: 11,
    level: 3,
    from,
    to,
    ...overrides,
});
const equipment = (itemId, itemStars, orbId = 11) => ({
    slots: { weapon: { itemId, itemStars, orbIds: [orbId], orbLevels: [3] } },
    characterStats: {},
});
const result = (id, level, value, changes = [], orbActions = []) => ({
    stage: { id, characterLevel: level, equipment: value },
    calculation: { stats: { CRITICAL_CHANCE: "5%" } },
    actions: [],
    orbActions,
    equipmentChanges: changes,
});
export const legendReport = () => ({
    stages: [
        result(
            "epic",
            60,
            equipment(100, 1),
            ["Kup i załóż Żmija."],
            [orb("ACQUIRE", null, null), orb("MOVE", null, position)]
        ),
        result("epic-nine", 120, equipment(100, 9), ["Ulepsz epik Żmij do 9★."]),
        result(
            "legend-one",
            120,
            equipment(101, 1),
            ["Ulepsz epik Żmij (9★) do legendy (1★)."],
            [orb("MOVE", position, null), orb("MOVE", null, position)]
        ),
        result(
            "legend-nine",
            120,
            equipment(101, 9, 12),
            ["Ulepsz legendę Żmij do 9★."],
            [
                orb("MOVE", position, null),
                orb("UPGRADE", null, null, {
                    beforeTemplateId: 11,
                    beforeLevel: 3,
                    templateId: 12,
                }),
                orb("MOVE", null, position, { templateId: 12 }),
            ]
        ),
        result("target", 140, equipment(101, 9, 12)),
    ],
    warnings: [],
    remainingDrifs: [],
    resSlots: ["ring1"],
});
