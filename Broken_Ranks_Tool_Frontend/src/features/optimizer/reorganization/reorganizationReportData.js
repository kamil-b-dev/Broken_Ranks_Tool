import {
    calculateItemCapacity,
    getEffectiveDrifMultiplier,
    calculateMaximumDrifSlots,
    ROMAN_TO_INT,
} from "../../../shared/domain/equipment/equipmentRules";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";

export const createReorganizationReport = ({
    before,
    after,
    usages,
    options,
    backpack,
    data,
    gameRules,
}) => {
    const slotName = (key, index) =>
        `${SLOTS.find((slot) => slot.key === key)?.label || key}, gniazdo ${index + 1}`;
    const findDrif = (id) => data?.drifs?.find((drif) => String(drif.id) === String(id));
    const moves = (usages || []).flatMap((usage) => {
        const { sourceSlotKey, sourceDrifIndex, slotKey, drifIndex, entryId } = usage;
        if (sourceSlotKey === slotKey && sourceDrifIndex === drifIndex) return [];
        const id =
            entryId != null
                ? backpack.find((entry) => entry.id === entryId)?.templateId
                : before[sourceSlotKey]?.drifIds?.[sourceDrifIndex];
        return [
            {
                name: findDrif(id)?.name || String(id),
                from: entryId != null ? "Plecak" : slotName(sourceSlotKey, sourceDrifIndex),
                to: slotName(slotKey, drifIndex),
            },
        ];
    });
    const returned = [];
    const fixed = (key, index) =>
        !(usages || []).some(
            (usage) => usage.sourceSlotKey === key && usage.sourceDrifIndex === index
        );
    // Only movable sources omitted by the search are returned; the caller supplies the original locks.
    if (options?.allowUnequip)
        for (const [key, slot] of Object.entries(before)) {
            const item = data?.items?.find((item) => String(item.id) === String(slot.itemId));
            if (["EPIC", "SET"].includes(item?.rarity) || options.lockedSlots?.includes(key))
                continue;
            (slot.drifIds || []).forEach((id, index) => {
                if (id && fixed(key, index) && !options.lockedDrifs?.[key]?.includes(index))
                    returned.push({
                        name: findDrif(id)?.name || String(id),
                        from: slotName(key, index),
                        to: "Plecak",
                    });
            });
        }
    const capacities = Object.entries(after || {}).flatMap(([key, slot]) => {
        const item = data?.items?.find((item) => String(item.id) === String(slot.itemId));
        if (!item || ["EPIC", "SET"].includes(item.rarity)) return [];
        const used = (value) =>
            (value?.drifIds || []).reduce(
                (sum, id, index) =>
                    sum +
                    (Number(gameRules?.drifBasePowers?.[findDrif(id)?.bonusType]) || 0) *
                        getEffectiveDrifMultiplier(value?.drifLevels?.[index] ?? 1),
                0
            );
        const initial = used(before[key]),
            final = used(slot);
        return initial === final && key !== options?.reservation?.slotKey
            ? []
            : [
                  {
                      slot: SLOTS.find((entry) => entry.key === key)?.label || key,
                      before: initial,
                      after: final,
                      capacity: calculateItemCapacity(item, slot.itemStars),
                  },
              ];
    });
    const upgrades = (options?.upgrades || (options?.upgrade ? [options.upgrade] : [])).flatMap(
        (upgrade) => {
            const destination = usages.find(
                (usage) =>
                    usage.sourceSlotKey === upgrade.sourceSlotKey &&
                    usage.sourceDrifIndex === upgrade.sourceDrifIndex
            );
            if (!destination) return [];
            const actualLevel = Number(
                after[destination.slotKey]?.drifLevels?.[destination.drifIndex] ?? 1
            );
            return [
                {
                    name: findDrif(before[upgrade.sourceSlotKey].drifIds[upgrade.sourceDrifIndex])
                        ?.name,
                    targetName: findDrif(upgrade.targetTemplateId)?.name,
                    before: Number(
                        before[upgrade.sourceSlotKey].drifLevels?.[upgrade.sourceDrifIndex] ?? 1
                    ),
                    after: actualLevel,
                    destination: slotName(destination.slotKey, destination.drifIndex),
                    maximizeLevel: upgrade.maximizeLevel === true,
                },
            ];
        }
    );
    let reservationSummary;
    if (options?.reservation) {
        const key = options.reservation.slotKey,
            slot = after[key];
        const item = data?.items?.find((item) => String(item.id) === String(slot?.itemId));
        const row = capacities.find(
            (row) => row.slot === (SLOTS.find((entry) => entry.key === key)?.label || key)
        );
        if (item && row)
            reservationSummary = {
                label: row.slot,
                freeCapacity: row.capacity - row.after,
                freeSockets:
                    calculateMaximumDrifSlots({
                        hasItem: true,
                        isEpicOrSet: false,
                        tier: ROMAN_TO_INT[item.tier] || Number(item.tier),
                        stars: Number(slot.itemStars ?? 1),
                    }) - (slot.drifIds || []).filter(Boolean).length,
            };
    }
    return {
        moves: [...moves, ...returned],
        capacities,
        upgrades,
        upgrade: upgrades[0],
        reservation: options?.reservation,
        reservationSummary,
    };
};
