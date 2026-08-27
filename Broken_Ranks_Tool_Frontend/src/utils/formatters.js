/**
 * Returns the Tailwind CSS text color for an item's rarity.
 * @param {string | undefined} rarity Item rarity, such as `EPIC` or `LEGENDARY`.
 * @returns {string} Tailwind CSS classes for the text color.
 */
export const getRarityColor = (rarity) => {
    if (!rarity) return "text-stone-300";
    switch (rarity.toUpperCase()) {
        case "SET":
            return "text-green-700 font-bold";
        case "EPIC":
            return "text-yellow-500 font-bold";
        case "LEGENDARY":
            return "text-orange-500 font-bold";
        case "RARE":
            return "text-blue-700 font-bold";
        default:
            return "text-stone-300";
    }
};

/**
 * Returns the Tailwind CSS text color for an upgrade star.
 * @param {number} starValue Upgrade star value from 1 to 9.
 * @param {boolean} isFilled Whether the star is currently filled.
 * @returns {string} Tailwind CSS classes for the star.
 */
export const getStarColor = (starValue, isFilled) => {
    if (!isFilled) return "text-stone-700";
    if (starValue <= 3) return "text-yellow-900";
    if (starValue <= 6) return "text-gray-400";
    return "text-amber-500";
};

/**
 * Returns the maximum level allowed for a drif size.
 * @param {string | undefined} size Drif size, such as `SUBDRIF`.
 * @returns {number} Maximum allowed level.
 */
export const getDrifMaxLvl = (size) => {
    if (!size) return 21;
    switch (size.toUpperCase()) {
        case "SUBDRIF":
            return 6;
        case "BIDRIF":
            return 11;
        case "MAGNIDRIF":
            return 16;
        case "ARCYDRIF":
            return 21;
        default:
            return 21;
    }
};

/**
 * Formats a group label for a dropdown list.
 * @param {string} type Group type.
 * @param {Array} items Items in the group.
 * @param {Object} translations Translation map used for display.
 * @returns {string} Formatted group label.
 */
export const formatGroupLabel = (type, items, translations) => {
    return translations[type] || type;
};

/**
 * Returns the Tailwind CSS text color for an upgrade star.
 * @param {number} starValue Upgrade star value from 1 to 9.
 * @param {boolean} isFilled Whether the star is currently filled.
 * @returns {string} Tailwind CSS classes for the text color.
 */
