import { SLOTS } from "../../constants/equipment";

const getSlots = (record) => record?.payload?.build?.requestData?.slots || {};
const populatedIds = (ids) => (Array.isArray(ids) ? ids.filter((id) => id != null) : []);

export const summarizeLocalBuild = (record) => {
    const slots = Object.values(getSlots(record));
    return {
        equipped: slots.filter((slot) => slot?.itemId != null).length,
        drifs: slots.reduce((sum, slot) => sum + populatedIds(slot?.drifIds).length, 0),
        orbs: slots.reduce((sum, slot) => sum + populatedIds(slot?.orbIds).length, 0),
        level: Number(record?.payload?.build?.characterConfig?.level) || 1,
        hasStats: Boolean(record?.stats && Object.keys(record.stats).length),
    };
};

export const createEquipmentComparisonRows = (builds, items = []) => {
    const itemById = new Map(items.map((item) => [String(item.id), item]));
    return SLOTS.map((slot) => {
        const values = builds.map((build) => {
            const slotData = getSlots(build)[slot.key];
            const item =
                slotData?.itemId != null ? itemById.get(String(slotData.itemId)) : undefined;
            const drifCount = populatedIds(slotData?.drifIds).length;
            const orbCount = populatedIds(slotData?.orbIds).length;
            return {
                itemName: item?.name || "Pusty slot",
                tier: item?.tier || null,
                stars: Number(slotData?.itemStars) || 0,
                drifCount,
                orbCount,
                signature: JSON.stringify({
                    itemId: slotData?.itemId ?? null,
                    itemStars: Number(slotData?.itemStars) || 0,
                    orbIds: populatedIds(slotData?.orbIds),
                    orbLevels: slotData?.orbLevels || [],
                    drifIds: populatedIds(slotData?.drifIds),
                    drifLevels: slotData?.drifLevels || {},
                }),
            };
        });
        return {
            key: slot.key,
            label: slot.label,
            values,
            differs: new Set(values.map((value) => value.signature)).size > 1,
        };
    });
};

const numericValue = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(
        String(value ?? "")
            .replace("%", "")
            .replace(",", ".")
    );
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatComparisonValue = (value) => {
    if (value == null || value === "") return "—";
    if (typeof value === "number")
        return value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
    return String(value);
};

export const createStatComparisonRows = (builds, bonusTranslations = {}) => {
    const keys = new Set(builds.flatMap((build) => Object.keys(build.stats || {})));
    return [...keys]
        .map((key) => {
            const values = builds.map((build) => build.stats?.[key] ?? null);
            const numericValues = values.map(numericValue);
            const finiteValues = numericValues.filter((value) => value != null);
            const highest = finiteValues.length ? Math.max(...finiteValues) : null;
            return {
                key,
                label: bonusTranslations[key] || key,
                values,
                highestIndexes:
                    highest == null
                        ? []
                        : numericValues.flatMap((value, index) =>
                              value === highest ? [index] : []
                          ),
                differs: new Set(values.map((value) => String(value ?? ""))).size > 1,
            };
        })
        .sort((left, right) => left.label.localeCompare(right.label, "pl"));
};
