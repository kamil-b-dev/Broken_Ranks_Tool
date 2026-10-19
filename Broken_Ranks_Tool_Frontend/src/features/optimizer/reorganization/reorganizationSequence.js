import { drifPower } from "./reorganizationPreflight";
import { calculateItemCapacity } from "../../../shared/domain/equipment/equipmentRules";

/** Builds an explicit remove/move/insert/upgrade sequence without overwriting sockets.
 * Temporary storage is counted separately from the final backpack-size constraint.
 */
export const createReorganizationSequence = ({
    before,
    after,
    usages,
    backpack = [],
    data,
    gameRules,
    options = {},
}) => {
    const drif = (id) => data.drifs.find((entry) => String(entry.id) === String(id));
    const position = (slot, index) => `${slot}:${index}`;
    const sources = new Map();
    const board = new Map();
    for (const [key, slot] of Object.entries(before)) {
        (slot.drifIds || []).forEach((id, index) => {
            if (!id) return;
            const source = {
                id: position(key, index),
                drif: drif(id),
                level: Number(slot.drifLevels?.[index] ?? 1),
                location: position(key, index),
            };
            sources.set(source.id, source);
            board.set(source.location, source.id);
        });
    }
    const pending = new Map();
    const used = new Set();
    for (const usage of usages) {
        const id =
            usage.entryId != null
                ? `backpack:${usage.entryId}`
                : position(usage.sourceSlotKey, usage.sourceDrifIndex);
        if (usage.entryId != null) {
            const entry = backpack.find((entry) => entry.id === usage.entryId);
            sources.set(id, {
                id,
                drif: drif(entry?.templateId),
                level: Number(entry?.level ?? 1),
                location: null,
            });
        }
        used.add(id);
        if (sources.get(id)?.location !== position(usage.slotKey, usage.drifIndex))
            pending.set(id, { slotKey: usage.slotKey, drifIndex: usage.drifIndex });
    }
    const returned = new Set(
        [...sources.keys()].filter((id) => {
            if (id.startsWith("backpack:") || used.has(id)) return false;
            const [key, index] = id.split(":");
            const item = data.items.find((item) => String(item.id) === String(before[key].itemId));
            return (
                !["EPIC", "SET"].includes(item?.rarity) &&
                !options.lockedSlots?.includes(key) &&
                !options.lockedDrifs?.[key]?.includes(Number(index))
            );
        })
    );
    const operations = [];
    let occupied = backpack.length,
        peak = occupied;
    const describe = (source) => ({
        name: source.drif?.name || "?",
        size: source.drif?.size,
        level: source.level,
    });
    const canPlace = (source, target) => {
        if (board.has(position(target.slotKey, target.drifIndex))) return false;
        const peers = [...board.entries()]
            .filter(([where, id]) => where.split(":")[0] === target.slotKey && id !== source.id)
            .map(([, id]) => sources.get(id));
        const type = source.drif?.bonusType;
        const elemental = (value) =>
            ["DAMAGE_ENERGY", "DAMAGE_FIRE", "DAMAGE_FROST"].includes(value);
        if (
            peers.some(
                (peer) =>
                    peer.drif?.bonusType === type ||
                    (elemental(type) && elemental(peer.drif?.bonusType))
            )
        )
            return false;
        const powers = [...peers, source].map((stone) =>
            drifPower(stone.drif, stone.level, gameRules)
        );
        // Unknown catalog power prevents promising an executable sequence.
        if (powers.includes(null)) return false;
        const item = data.items.find(
            (item) => String(item.id) === String(after[target.slotKey].itemId)
        );
        const stars = Number(after[target.slotKey].itemStars ?? 1);
        const capacity = calculateItemCapacity(item, stars);
        return powers.reduce((sum, power) => sum + power, 0) <= capacity;
    };
    while (pending.size || returned.size) {
        let progressed = false;
        for (const [id, target] of pending) {
            const source = sources.get(id);
            if (!source || !canPlace(source, target)) continue;
            const from = source.location;
            operations.push({
                kind: from ? "MOVE" : "INSERT",
                ...describe(source),
                from,
                to: position(target.slotKey, target.drifIndex),
            });
            if (from) board.delete(from);
            else occupied--;
            source.location = position(target.slotKey, target.drifIndex);
            board.set(source.location, id);
            pending.delete(id);
            progressed = true;
        }
        if (progressed) continue;
        const removeId =
            [...returned].find((id) => sources.get(id)?.location) ||
            [...pending.keys()].find((id) => sources.get(id)?.location);
        if (!removeId) return { operations: [], unavailable: true, extraSlotsNeeded: 0 };
        const source = sources.get(removeId);
        operations.push({
            kind: "REMOVE",
            ...describe(source),
            from: source.location,
            temporary: !returned.has(removeId),
        });
        board.delete(source.location);
        source.location = null;
        returned.delete(removeId);
        peak = Math.max(peak, ++occupied);
    }
    for (const upgrade of options.upgrades || (options.upgrade ? [options.upgrade] : [])) {
        const id = position(upgrade.sourceSlotKey, upgrade.sourceDrifIndex);
        const source = sources.get(id);
        if (!source?.location) continue;
        const [key, index] = source.location.split(":");
        const target = drif(after[key].drifIds[index]);
        const level = Number(after[key].drifLevels?.[index] ?? 1);
        if (target?.id === source.drif?.id && level === source.level) continue;
        operations.push({
            kind: "UPGRADE",
            ...describe(source),
            to: source.location,
            targetName: target?.name,
            targetSize: target?.size,
            targetLevel: level,
        });
    }
    return { operations, extraSlotsNeeded: Math.max(0, peak - 200), peakBackpackSlots: peak };
};
