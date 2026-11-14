const SIZES = {
    SUBDRIF: "Subdrif",
    BIDRIF: "Bidrif",
    MAGNIDRIF: "Magnidrif",
    ARCYDRIF: "Arcydrif",
    SUBORB: "Suborb",
    BIORB: "Biorb",
    MAGNIORB: "Magniorb",
    ARCYORB: "Arcyorb",
};
export const stoneLabel = (stone, level) =>
    `${SIZES[stone.size] || stone.size || ""} ${stone.name} ${level}`.trim();
export const statisticLabel = (name, data, t = (value) => value) =>
    t(data.gameRules?.bonusTranslations?.[name] || name);
