export const CATEGORY_DESCRIPTIONS = {
    OFFENSIVE: "Presja, trafienie i obrażenia",
    DEFENSIVE: "Redukcje, obrona i odporności",
    UTILITY: "Zasoby, regeneracja i kontrola",
};

export const formatAverage = (value) =>
    value == null
        ? "—"
        : value.toLocaleString("pl-PL", {
              minimumFractionDigits: value % 1 ? 1 : 0,
              maximumFractionDigits: 1,
          });
