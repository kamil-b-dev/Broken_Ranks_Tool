/**
 * Zwraca klasę Tailwind CSS dla koloru tekstu na podstawie rzadkości przedmiotu.
 * @param {string | undefined} rarity Rzadkość przedmiotu (np. "EPIC", "LEGENDARY").
 * @returns {string} Klasa CSS z kolorem tekstu.
 */
export const getRarityColor = (rarity) => {
    if (!rarity) return "text-stone-300";
    switch (rarity.toUpperCase()) {
        case 'SET': return "text-green-700 font-bold";
        case 'EPIC': return "text-yellow-500 font-bold";
        case 'LEGENDARY': return "text-orange-500 font-bold";
        case 'RARE': return "text-blue-700 font-bold";
        default: return "text-stone-300";
    }
};

/**
 * Zwraca klasę Tailwind CSS dla koloru gwiazdki ulepszenia.
 * @param {number} starValue Wartość gwiazdki (1-9).
 * @param {boolean} isFilled Czy gwiazdka ma być "wypełniona".
 * @returns {string} Klasa CSS z kolorem tekstu.
 */
export const getStarColor = (starValue, isFilled) => {
    if (!isFilled) return "text-stone-700";
    if (starValue <= 3) return "text-yellow-900";
    if (starValue <= 6) return "text-gray-400";
    return "text-amber-500";
};

/**
 * Zwraca maksymalny poziom dla danego rozmiaru drifu.
 * @param {string | undefined} size Rozmiar drifu (np. "SUBDRIF").
 * @returns {number} Maksymalny poziom.
 */
export const getDrifMaxLvl = (size) => {
    if (!size) return 21;
    switch (size.toUpperCase()) {
        case 'SUBDRIF': return 6;
        case 'BIDRIF': return 11;
        case 'MAGNIDRIF': return 16;
        case 'ARCYDRIF': return 21;
        default: return 21;
    }
};

/**
 * Formatuje etykietę dla grupy w liście rozwijanej.
 * @param {string} type Typ grupy.
 * @param {Array} items Elementy w grupie.
 * @param {Object} translations Mapa tłumaczeń.
 * @returns {string} Sformatowana etykieta.
 */
export const formatGroupLabel = (type, items, translations) => {
    return translations[type] || type;
};
