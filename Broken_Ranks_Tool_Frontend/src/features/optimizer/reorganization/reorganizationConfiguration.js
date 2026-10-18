import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { DRIF_SIZE_ORDER } from "../../../shared/domain/equipment/drifCategories";
import {
    calculateItemCapacity,
    calculateMaximumDrifSlots,
    ROMAN_TO_INT,
} from "../../../shared/domain/equipment/equipmentRules";

export const LEVEL_LIMITS = { SUBDRIF: 6, BIDRIF: 11, MAGNIDRIF: 16, ARCYDRIF: 21 };
export const DEFAULT_REORGANIZATION = {
    task: "UPGRADE",
    allowUnequip: false,
    maxMoves: 50,
    source: "",
    targetTemplateId: "",
    targetLevel: null,
    maximizeLevel: false,
    upgrades: [],
    insertEntryId: "",
    reservation: { slotKey: "", freeSockets: 1, freeCapacity: 0 },
    protectedModifiers: {},
};
export const normalizeReorganization = (value = {}) => ({
    ...DEFAULT_REORGANIZATION,
    task: ["UPGRADE", "INSERT", "RESERVE"].includes(value?.task) ? value.task : "UPGRADE",
    allowUnequip: value?.allowUnequip === true,
    maxMoves: value?.maxMoves ?? 50,
    source: typeof value?.source === "string" ? value.source : "",
    targetTemplateId: value?.targetTemplateId ?? "",
    targetLevel: value?.targetLevel ?? null,
    maximizeLevel: value?.maximizeLevel === true,
    upgrades: Array.isArray(value?.upgrades)
        ? value.upgrades
              .slice(0, 36)
              .filter((row) => row && typeof row === "object")
              .map((row) => ({
                  source: typeof row.source === "string" ? row.source : "",
                  targetTemplateId: row.targetTemplateId ?? "",
                  targetLevel: row.targetLevel ?? null,
                  maximizeLevel: row.maximizeLevel === true,
              }))
        : [],
    insertEntryId: typeof value?.insertEntryId === "string" ? value.insertEntryId : "",
    reservation: {
        ...DEFAULT_REORGANIZATION.reservation,
        ...(value?.reservation && typeof value.reservation === "object" ? value.reservation : {}),
    },
    protectedModifiers:
        value?.protectedModifiers &&
        typeof value.protectedModifiers === "object" &&
        !Array.isArray(value.protectedModifiers)
            ? value.protectedModifiers
            : {},
});
export const upgradeRows = (options) =>
    options.upgrades.length
        ? options.upgrades
        : [
              {
                  source: options.source,
                  targetTemplateId: options.targetTemplateId,
                  targetLevel: options.targetLevel,
                  maximizeLevel: options.maximizeLevel,
              },
          ];
export const reservationItems = ({ slots = {}, data = {} }) =>
    Object.entries(slots).flatMap(([slotKey, slot]) => {
        const item = data.items?.find((item) => String(item.id) === String(slot?.itemId));
        if (!item || ["EPIC", "SET"].includes(item.rarity)) return [];
        return [
            {
                slotKey,
                item,
                label: SLOTS.find((entry) => entry.key === slotKey)?.label || slotKey,
                capacity: calculateItemCapacity(item, slot.itemStars),
                sockets: calculateMaximumDrifSlots({
                    hasItem: true,
                    isEpicOrSet: false,
                    tier: ROMAN_TO_INT[item.tier] || Number(item.tier),
                    stars: Number(slot.itemStars ?? 1),
                }),
            },
        ];
    });
export const reorganizationStones = ({
    slots = {},
    data = {},
    lockedSlots = [],
    lockedDrifs = {},
}) =>
    Object.entries(slots).flatMap(([slotKey, slot]) => {
        const item = data.items?.find((entry) => String(entry.id) === String(slot?.itemId));
        return (slot?.drifIds || []).flatMap((id, index) => {
            const drif = data.drifs?.find((entry) => String(entry.id) === String(id));
            if (!drif) return [];
            return [
                {
                    key: `${slotKey}:${index}`,
                    slotKey,
                    index,
                    drif,
                    level: Number(slot.drifLevels?.[index] ?? 1),
                    slotLabel: SLOTS.find((entry) => entry.key === slotKey)?.label || slotKey,
                    movable:
                        !["EPIC", "SET"].includes(item?.rarity) &&
                        !lockedSlots.includes(slotKey) &&
                        !(lockedDrifs[slotKey] || []).includes(index),
                },
            ];
        });
    });

export const upgradeSelection = (options, stones, drifs = []) => {
    const source = options.source
        ? stones.find((stone) => stone.key === options.source && stone.movable)
        : stones.find((stone) => stone.movable);
    const targets = source
        ? drifs
              .filter(
                  (drif) =>
                      drif.bonusType === source.drif.bonusType &&
                      DRIF_SIZE_ORDER.indexOf(drif.size) >=
                          DRIF_SIZE_ORDER.indexOf(source.drif.size) &&
                      (options.maximizeLevel ||
                          drif.size !== source.drif.size ||
                          LEVEL_LIMITS[drif.size] > source.level)
              )
              .sort(
                  (a, b) =>
                      DRIF_SIZE_ORDER.indexOf(a.size) - DRIF_SIZE_ORDER.indexOf(b.size) ||
                      Number(a.id) - Number(b.id)
              )
        : [];
    const target =
        options.targetTemplateId !== ""
            ? targets.find((drif) => String(drif.id) === String(options.targetTemplateId))
            : targets[0];
    const level =
        options.targetLevel == null
            ? LEVEL_LIMITS[target?.size]
            : options.targetLevel === ""
              ? ""
              : Number(options.targetLevel);
    return { source, targets, target, level };
};

export const buildReorganizationConfiguration = (settings, input) => {
    const options = normalizeReorganization(settings.reorganization);
    const stones = reorganizationStones(input);
    const maxMoves =
        typeof options.maxMoves === "number" || typeof options.maxMoves === "string"
            ? Number(options.maxMoves)
            : NaN;
    if (!Number.isInteger(maxMoves) || maxMoves < 1 || maxMoves > 50)
        throw new Error("Limit przełożeń musi być liczbą całkowitą od 1 do 50.");
    const protectedModifiers = Object.fromEntries(
        Object.entries(options.protectedModifiers).map(([key, rule]) => {
            const loss = Number(String(rule?.loss ?? 0).replace(",", "."));
            if (!rule || typeof rule !== "object" || !Number.isFinite(loss) || loss < 0)
                throw new Error("Dopuszczalny spadek musi być nieujemną liczbą.");
            return [key, { enabled: rule.enabled !== false, loss }];
        })
    );
    const reorganization = {
        task: options.task,
        allowUnequip: options.allowUnequip,
        maxMoves,
        protectedModifiers,
    };
    if (options.task === "UPGRADE") {
        const used = new Set();
        reorganization.upgrades = upgradeRows(options).map((row) => {
            const { source, target, level } = upgradeSelection(row, stones, input.data.drifs);
            if (
                !source ||
                !target ||
                used.has(source.key) ||
                !Number.isInteger(level) ||
                level < source.level ||
                level > LEVEL_LIMITS[target.size] ||
                (!row.maximizeLevel && level === source.level && source.drif.size === target.size)
            )
                throw new Error("Wybierz różne niezablokowane drify i ich docelowe ulepszenia.");
            used.add(source.key);
            return {
                sourceSlotKey: source.slotKey,
                sourceDrifIndex: source.index,
                targetTemplateId: Number(target.id),
                targetLevel: row.maximizeLevel ? LEVEL_LIMITS[target.size] : level,
                ...(row.maximizeLevel ? { maximizeLevel: true } : {}),
            };
        });
        if (
            reorganization.upgrades.length > 1 &&
            reorganization.upgrades.some((row) => row.maximizeLevel)
        )
            throw new Error("Szukanie najwyższego poziomu dotyczy jednego kamienia.");
    } else if (options.task === "INSERT") {
        const entry = input.backpack?.find(
            (entry) => entry.kind === "DRIF" && entry.id === options.insertEntryId
        );
        if (!entry) throw new Error("Wybierz konkretny osobny drif z plecaka.");
        reorganization.insertEntryId = entry.id;
    } else {
        const available = reservationItems(input);
        const chosen =
            available.find((item) => item.slotKey === options.reservation.slotKey) ||
            (!options.reservation.slotKey ? available[0] : null);
        const freeSockets =
            options.reservation.freeSockets === "" ? NaN : Number(options.reservation.freeSockets);
        const freeCapacity =
            options.reservation.freeCapacity === ""
                ? NaN
                : Number(options.reservation.freeCapacity);
        if (
            !chosen ||
            !Number.isInteger(freeSockets) ||
            !Number.isInteger(freeCapacity) ||
            freeSockets < 0 ||
            freeSockets > chosen.sockets ||
            freeCapacity < 0 ||
            freeCapacity > chosen.capacity ||
            (freeSockets === 0 && freeCapacity === 0)
        )
            throw new Error("Wskaż przedmiot oraz dostępną liczbę wolnych gniazd lub pojemność.");
        reorganization.reservation = { slotKey: chosen.slotKey, freeSockets, freeCapacity };
    }
    return {
        mode: "REORGANIZE",
        configurationMode: "ADVANCED",
        priorities: {},
        reorganization,
    };
};
