import {
    getEffectiveDrifMultiplier,
    getMaximumStoneSizeIndex,
    ROMAN_TO_INT,
    SIZE_INDEX,
} from "../../../shared/domain/equipment/equipmentRules";
import { numericStatValue } from "../optimizerDomain";
import {
    buildReorganizationConfiguration,
    reorganizationStones,
    reservationItems,
} from "./reorganizationConfiguration";

export const drifPower = (drif, level, gameRules) => {
    const base = Number(gameRules?.drifBasePowers?.[drif?.bonusType]);
    return Number.isFinite(base) ? base * getEffectiveDrifMultiplier(level) : null;
};

export const reorganizationItemSpace = (item, stones, gameRules) => {
    const contained = stones.filter((stone) => stone.slotKey === item.slotKey);
    const powers = contained.map((stone) => drifPower(stone.drif, stone.level, gameRules));
    return {
        freeSockets: item.sockets - contained.length,
        freeCapacity: powers.includes(null)
            ? null
            : item.capacity - powers.reduce((sum, power) => sum + power, 0),
        stones: contained,
    };
};

/** Uses calculator values; reductions retain their negative display direction. */
export const reorganizationProtection = (key, rawValue, cap, loss = 0) => {
    const value = numericStatValue(rawValue);
    if (!Number.isFinite(value)) return null;
    const direction = ["MANA_USAGE_REDUCTION", "STAMINA_USAGE_REDUCTION"].includes(key) ? -1 : 1;
    const useful = Math.min(
        Math.max(0, value * direction),
        cap == null ? Infinity : Math.abs(Number(cap))
    );
    const parsedLoss = Number(String(loss).replace(",", "."));
    return {
        value,
        cap: cap == null ? null : Number(cap),
        minimum:
            Number.isFinite(parsedLoss) && parsedLoss >= 0
                ? direction * Math.max(0, useful - parsedLoss)
                : null,
    };
};

/** Necessary conditions only: passing this check does not prove a layout exists. */
export const reorganizationPreflight = (settings, input) => {
    let configuration;
    try {
        configuration = buildReorganizationConfiguration(settings, input);
    } catch (error) {
        return { blocked: true, message: error.message };
    }
    const options = configuration.reorganization;
    const stones = reorganizationStones(input);
    const items = reservationItems(input);
    const rules = input.gameRules || input.data?.gameRules;
    const spaces = new Map(
        items.map((item) => [item.slotKey, reorganizationItemSpace(item, stones, rules)])
    );
    const reservation = options.reservation;
    const obstacle = (message) => ({ blocked: true, message, configuration });
    if (reservation) {
        const item = items.find((item) => item.slotKey === reservation.slotKey);
        const space = spaces.get(item.slotKey);
        if (
            space.freeSockets >= reservation.freeSockets &&
            space.freeCapacity != null &&
            space.freeCapacity >= reservation.freeCapacity
        )
            return {
                alreadySatisfied: true,
                message: "Przedmiot ma już wymagane wolne gniazda i pojemność.",
                configuration,
            };
        const fixed = space.stones.filter((stone) => !stone.movable);
        const fixedPowers = fixed.map((stone) => drifPower(stone.drif, stone.level, rules));
        if (
            item.sockets - fixed.length < reservation.freeSockets ||
            (!fixedPowers.includes(null) &&
                item.capacity - fixedPowers.reduce((sum, power) => sum + power, 0) <
                    reservation.freeCapacity)
        )
            return obstacle(
                "Blokady w wybranym przedmiocie nie pozwalają zwolnić wymaganego miejsca."
            );
    }
    const insertions =
        options.insertions || (options.insertEntryId ? [{ entryId: options.insertEntryId }] : []);
    if (insertions.length > options.maxMoves)
        return obstacle(
            "Każdy wstawiany drif wymaga jednego przełożenia. Zwiększ limit przełożeń."
        );
    if (!options.allowUnequip) {
        const free = items.reduce((sum, item) => sum + spaces.get(item.slotKey).freeSockets, 0);
        if (free - (reservation?.freeSockets || 0) < insertions.length)
            return obstacle(
                "Za mało gniazd, aby zachować wszystkie założone drify i wykonać zadanie. Pozwól odkładać drify lub zmniejsz wymagania."
            );
    }
    const required = [
        ...(options.upgrades || []).map((upgrade) => {
            const source = stones.find(
                (stone) =>
                    stone.slotKey === upgrade.sourceSlotKey &&
                    stone.index === upgrade.sourceDrifIndex
            );
            return {
                drif: input.data.drifs.find(
                    (drif) => String(drif.id) === String(upgrade.targetTemplateId)
                ),
                level: upgrade.maximizeLevel ? source.level : upgrade.targetLevel,
            };
        }),
        ...insertions.map((insertion) => {
            const entry = input.backpack.find((entry) => entry.id === insertion.entryId);
            return {
                drif: input.data.drifs.find((drif) => String(drif.id) === String(entry.templateId)),
                level: entry.level,
                targetSlotKey: insertion.targetSlotKey,
            };
        }),
    ];
    for (const requiredStone of required) {
        const { drif, level, targetSlotKey } = requiredStone;
        const power = drifPower(drif, level, rules);
        const fits = items.some((item) => {
            if (
                (targetSlotKey && targetSlotKey !== item.slotKey) ||
                input.lockedSlots?.includes(item.slotKey)
            )
                return false;
            if (
                SIZE_INDEX[drif?.size] >
                getMaximumStoneSizeIndex(ROMAN_TO_INT[item.item.tier] || Number(item.item.tier))
            )
                return false;
            if (
                ["DAMAGE_ENERGY", "DAMAGE_FIRE", "DAMAGE_FROST"].includes(drif?.bonusType) &&
                item.slotKey !== "weapon"
            )
                return false;
            const fixed = spaces.get(item.slotKey).stones.filter((stone) => !stone.movable);
            if (
                fixed.some(
                    (stone) =>
                        stone.drif.bonusType === drif?.bonusType ||
                        (["DAMAGE_ENERGY", "DAMAGE_FIRE", "DAMAGE_FROST"].includes(
                            drif?.bonusType
                        ) &&
                            ["DAMAGE_ENERGY", "DAMAGE_FIRE", "DAMAGE_FROST"].includes(
                                stone.drif.bonusType
                            ))
                )
            )
                return false;
            const reservedHere = reservation?.slotKey === item.slotKey ? reservation : null;
            if (item.sockets - fixed.length - (reservedHere?.freeSockets || 0) <= 0) return false;
            const fixedPowers = fixed.map((stone) => drifPower(stone.drif, stone.level, rules));
            return (
                power == null ||
                fixedPowers.includes(null) ||
                power + fixedPowers.reduce((sum, value) => sum + value, 0) <=
                    item.capacity - (reservedHere?.freeCapacity || 0)
            );
        });
        if (!fits)
            return obstacle(
                "Wskazany drif nie mieści się w żadnym dozwolonym przedmiocie przy obecnym tierze, pojemności i blokadach."
            );
    }
    return { blocked: false, configuration };
};
