import { SLOTS } from "../../constants/equipment";

const valueAt = (values, index) => values?.[index] || null;
const levelAt = (slot, index) =>
    valueAt(slot?.drifIds, index) == null ? null : Number(slot?.drifLevels?.[index]) || 1;
const drifLabel = (drif) =>
    drif ? [drif.size, drif.name || drif.bonusType].filter(Boolean).join(" ") : null;

/** Describes how a suggested setup differs from the build currently being inspected. */
export const createRecommendationChanges = ({ currentSlots, suggestedSlots, items, drifs, orbs = [] }) => {
    const drifsById = new Map(drifs.map((drif) => [String(drif.id), drif]));
    const itemsById = new Map(items.map((item) => [String(item.id), item]));
    const orbsById = new Map(orbs.map((orb) => [String(orb.id), orb]));
    const changes = [];
    SLOTS.forEach(({ key }) => {
        const current = currentSlots?.[key];
        const suggested = suggestedSlots?.[key];
        if (String(current?.itemId || "") !== String(suggested?.itemId || "")) {
            const fromItem = itemsById.get(String(current?.itemId));
            const toItem = itemsById.get(String(suggested?.itemId));
            changes.push({
                slotKey: key,
                itemName: toItem?.name || key,
                fromModifier: fromItem ? `Przedmiot: ${fromItem.name}` : null,
                fromLevel: null,
                toModifier: toItem ? `Przedmiot: ${toItem.name}` : null,
                toLevel: null,
            });
        }
        const currentStars = Number(current?.itemStars) || 1;
        const suggestedStars = Number(suggested?.itemStars) || 1;
        if (
            String(current?.itemId || "") === String(suggested?.itemId || "") &&
            currentStars !== suggestedStars
        ) {
            const item = itemsById.get(String(suggested?.itemId));
            changes.push({
                slotKey: key,
                itemName: item?.name || key,
                fromModifier: `Gwiazdki: ${currentStars}`,
                fromLevel: null,
                toModifier: `Gwiazdki: ${suggestedStars}`,
                toLevel: null,
            });
        }
        const orbCount = Math.max(current?.orbIds?.length || 0, suggested?.orbIds?.length || 0);
        for (let index = 0; index < orbCount; index += 1) {
            const fromOrbId = valueAt(current?.orbIds, index);
            const toOrbId = valueAt(suggested?.orbIds, index);
            const fromOrbLevel = Number(current?.orbLevels?.[index]) || null;
            const toOrbLevel = Number(suggested?.orbLevels?.[index]) || null;
            if (String(fromOrbId || "") === String(toOrbId || "") && fromOrbLevel === toOrbLevel)
                continue;
            changes.push({
                slotKey: key,
                itemName: itemsById.get(String(suggested?.itemId || current?.itemId))?.name || key,
                fromModifier: fromOrbId ? `Orb: ${orbsById.get(String(fromOrbId))?.name || fromOrbId}` : null,
                fromLevel: fromOrbLevel,
                toModifier: toOrbId ? `Orb: ${orbsById.get(String(toOrbId))?.name || toOrbId}` : null,
                toLevel: toOrbLevel,
            });
        }
        const count = Math.max(current?.drifIds?.length || 0, suggested?.drifIds?.length || 0);
        for (let index = 0; index < count; index += 1) {
            const fromId = valueAt(current?.drifIds, index);
            const toId = valueAt(suggested?.drifIds, index);
            const fromLevel = levelAt(current, index);
            const toLevel = levelAt(suggested, index);
            if (String(fromId || "") === String(toId || "") && fromLevel === toLevel) continue;
            const from = fromId ? drifsById.get(String(fromId)) : null;
            const to = toId ? drifsById.get(String(toId)) : null;
            const itemId = suggested?.itemId || current?.itemId;
            changes.push({
                slotKey: key,
                itemName: itemsById.get(String(itemId))?.name || key,
                fromModifier: drifLabel(from),
                fromLevel,
                toModifier: drifLabel(to),
                toLevel,
            });
        }
    });
    return changes;
};
