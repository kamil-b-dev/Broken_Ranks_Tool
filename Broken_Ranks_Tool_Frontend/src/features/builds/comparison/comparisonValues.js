export const toFiniteNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(
        String(value ?? "")
            .replaceAll("%", "")
            .replace(",", ".")
    );
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatComparisonValue = (value, locale = "pl-PL") => {
    if (value == null || value === "") return "—";
    if (typeof value === "number")
        return value.toLocaleString(locale, { maximumFractionDigits: 2 });
    return String(value);
};
