import { getDrifMaxLevel, getOrbMaxLevel } from "../../shared/domain/equipment/equipmentRules";
import { calculateItemCapacity, getEffectiveDrifMultiplier } from "./gear-slot/gearSlotDomain";

/** Maximizes existing stones, reserving minimum power for later drif positions. */
export const maximizeStoneLevels = ({ slots, items, orbs, drifs, gameRules, kind }) => {
    const updates = {};
    const warnings = [];
    for (const [key, slot] of Object.entries(slots || {})) {
        const item = items.find((candidate) => String(candidate.id) === String(slot?.itemId));
        if (!item) continue;
        if (kind === "orbs") {
            updates[key] = {
                ...slot,
                orbLevels: (slot.orbIds || []).map((id) => {
                    const orb = orbs.find((candidate) => String(candidate.id) === String(id));
                    return id && orb ? getOrbMaxLevel(orb.size) : null;
                }),
            };
            continue;
        }
        const builtIn = ["EPIC", "SET"].includes(item.rarity?.toUpperCase());
        const stones = (slot.drifIds || []).flatMap((id, index) => {
            if (!id) return [];
            const drif = drifs.find((candidate) => String(candidate.id) === String(id));
            return drif
                ? [{ drif, index, power: gameRules.drifBasePowers?.[drif.bonusType] || 0 }]
                : [];
        });
        const levels = {};
        const capacity = calculateItemCapacity(item, Number(slot.itemStars) || 1);
        let remaining =
            capacity - stones.reduce((sum, stone) => sum + (builtIn ? 0 : stone.power), 0);
        const limited = [];
        for (const { drif, index, power } of stones) {
            const maximum = builtIn ? 16 : getDrifMaxLevel(drif.size);
            let level = maximum;
            if (!builtIn) {
                while (level > 1 && power * (getEffectiveDrifMultiplier(level) - 1) > remaining)
                    level--;
                remaining -= power * (getEffectiveDrifMultiplier(level) - 1);
            }
            levels[index] = level;
            if (level < maximum)
                limited.push(
                    `${drif.name || drif.description || gameRules.bonusTranslations?.[drif.bonusType] || drif.bonusType} (${level}/${maximum})`
                );
        }
        if (!builtIn && remaining < 0) {
            warnings.push(`${item.name}: brak pojemności nawet na poziom 1 wszystkich drifów.`);
            continue;
        }
        updates[key] = { ...slot, drifLevels: levels };
        if (limited.length) warnings.push(`${item.name}: ${limited.join(", ")}.`);
    }
    return { updates, warnings };
};
