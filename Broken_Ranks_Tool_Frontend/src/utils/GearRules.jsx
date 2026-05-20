export const ROMAN_TO_INT = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
export const ROMAN_ORDER = { "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10, "XI": 11, "XII": 12 };
export const SIZE_INDEX = { SUBDRIF: 0, BIDRIF: 1, MAGNIDRIF: 2, ARCYDRIF: 3 };
export const SIZE_ORDER = { "SUBDRIF": 1, "BIDRIF": 2, "MAGNIDRIF": 3, "ARCYDRIF": 4 };


export const getDrifMaxLvl = (size) => {
    if (size === "SUBDRIF") return 6;
    if (size === "BIDRIF") return 11;
    if (size === "MAGNIDRIF") return 16;
    return 21;
};

export const DRIF_MULTIPLIERS = {
    SUBDRIF: 1,
    BIDRIF: 2,
    MAGNIDRIF: 3,
    ARCYDRIF: 4
};

export const getStarColor = (value, isFilled) => {
    if (!isFilled) return "text-neutral-700";
    if (value <= 3) return "text-orange-700 drop-shadow-[0_0_4px_rgba(194,65,12,0.8)]";
    if (value <= 6) return "text-slate-300 drop-shadow-[0_0_4px_rgba(203,213,225,0.8)]";
    return "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]";
};

export const formatGroupLabel = (groupKey, itemsArray, translationsDict) => {
    const item = itemsArray?.[0];
    const translatedBonus = translationsDict?.[item?.bonusType] || item?.bonusType;

    if (!item || !item.bonusType || item.bonusType === groupKey) {
        return translationsDict?.[groupKey] || groupKey;
    }
    return `${groupKey} (${translatedBonus})`;
};