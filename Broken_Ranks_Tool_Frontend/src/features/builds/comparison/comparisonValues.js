export const toFiniteNumber = (value) => {
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
