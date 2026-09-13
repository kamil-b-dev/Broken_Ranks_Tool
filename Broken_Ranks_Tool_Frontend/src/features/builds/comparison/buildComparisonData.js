import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";

export const getBuildSlots = (record) => record?.payload?.build?.requestData?.slots || {};

export const getPopulatedIds = (ids) => (Array.isArray(ids) ? ids.filter((id) => id != null) : []);

export const summarizeLocalBuild = (record) => {
    const slots = Object.values(getBuildSlots(record));
    return {
        equipped: slots.filter((slot) => slot?.itemId != null).length,
        drifs: slots.reduce((sum, slot) => sum + getPopulatedIds(slot?.drifIds).length, 0),
        orbs: slots.reduce((sum, slot) => sum + getPopulatedIds(slot?.orbIds).length, 0),
        level: Number(record?.payload?.build?.characterConfig?.level) || 1,
        hasStats: Boolean(record?.stats && Object.keys(record.stats).length),
    };
};

export const createEquipmentComparisonRows = (builds, items = []) => {
    const itemById = new Map(items.map((item) => [String(item.id), item]));
    return SLOTS.map((slot) => {
        const values = builds.map((build) => {
            const slotData = getBuildSlots(build)[slot.key];
            const item =
                slotData?.itemId != null ? itemById.get(String(slotData.itemId)) : undefined;
            const drifCount = getPopulatedIds(slotData?.drifIds).length;
            const orbCount = getPopulatedIds(slotData?.orbIds).length;
            return {
                itemName: item?.name || "Pusty slot",
                tier: item?.tier || null,
                stars: Number(slotData?.itemStars) || 0,
                drifCount,
                orbCount,
                signature: JSON.stringify({
                    itemId: slotData?.itemId ?? null,
                    itemStars: Number(slotData?.itemStars) || 0,
                    orbIds: getPopulatedIds(slotData?.orbIds),
                    orbLevels: slotData?.orbLevels || [],
                    drifIds: getPopulatedIds(slotData?.drifIds),
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
