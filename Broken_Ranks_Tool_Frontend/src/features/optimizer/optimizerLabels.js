import { DRIF_SIZE_ORDER } from "../../shared/domain/equipment/drifCategories";

export const OPTIMIZER_LABEL_STORAGE_KEY = "broken-ranks-tool.optimizer-labels.v1";
export const normalizeOptimizerLabelMode = (mode) => (mode === "DRIFS" ? "DRIFS" : "MODIFIERS");

/** Derives display names from the catalog without changing optimizer identifiers. */
export const createOptimizerLabels = (gameRules = {}, drifs = [], mode = "MODIFIERS") => {
    const translations = gameRules?.bonusTranslations || {};
    const stoneNames = new Map();
    [...drifs]
        .sort((left, right) => {
            const rank = (size) => {
                const index = DRIF_SIZE_ORDER.indexOf(size);
                return index < 0 ? DRIF_SIZE_ORDER.length : index;
            };
            return (
                rank(left.size) - rank(right.size) ||
                String(left.name || "").localeCompare(String(right.name || ""), "pl")
            );
        })
        .forEach((drif) => {
            const name = typeof drif.name === "string" ? drif.name.trim() : "";
            if (name && drif.bonusType && !stoneNames.has(drif.bonusType))
                stoneNames.set(drif.bonusType, name);
        });
    const getName = (key, fallback) =>
        (mode === "DRIFS" && stoneNames.get(key)) || fallback || translations[key] || key;
    const aliases = new Map();
    const addAlias = (label, key) => {
        const name = stoneNames.get(key);
        if (!label || !name) return;
        const normalized = label.toLocaleLowerCase("pl");
        if (aliases.has(normalized) && aliases.get(normalized) !== name)
            aliases.set(normalized, null);
        else if (!aliases.has(normalized)) aliases.set(normalized, name);
    };
    Object.entries(translations).forEach(([key, label]) => addAlias(label, key));
    addAlias("Redukcja zużycia many", "MANA_USAGE_REDUCTION");
    addAlias("Redukcja zużycia kondycji", "STAMINA_USAGE_REDUCTION");
    const replacements = [...aliases.entries()].filter(([, name]) => name);
    const escaped = replacements
        .map(([label]) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .sort((left, right) => right.length - left.length);
    const pattern = escaped.length
        ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${escaped.join("|")})(?![\\p{L}\\p{N}_])`, "giu")
        : null;
    const formatText = (text) =>
        mode === "DRIFS" && typeof text === "string" && pattern
            ? text.replace(pattern, (label) => aliases.get(label.toLocaleLowerCase("pl")))
            : text;
    return {
        mode,
        getName,
        formatText,
        searchName: (key) => stoneNames.get(key) || translations[key] || key,
    };
};
