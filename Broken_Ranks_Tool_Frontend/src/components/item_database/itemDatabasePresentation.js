export const getRarityColor = (rarity) => {
    const gradients = {
        SET: "from-green-400 to-green-600",
        EPIC: "from-yellow-400 to-yellow-600",
        LEGENDARY: "from-orange-400 to-orange-600",
        RARE: "from-blue-400 to-blue-600",
    };
    return `bg-clip-text text-transparent bg-gradient-to-r ${gradients[rarity?.toUpperCase()] || "from-stone-400 to-stone-500"} font-bold`;
};

export const getVariantLabel = (variant) => {
    const value = (variant.size || variant.tier || "").toUpperCase();
    return (
        { SUBDRIF: "S", BIDRIF: "B", MAGNIDRIF: "M", ARCYDRIF: "A" }[value] ||
        (value.length <= 3 ? value : value[0])
    );
};

export const doubleIncrement = (increment) => {
    if (!increment) return "?";
    const clean = increment.replace(/\+/g, "").trim();
    const parsed = Number.parseFloat(clean.replace(",", "."));
    if (Number.isNaN(parsed)) return "?";
    const value = `${parsed * 2}`.replace(".", ",") + (clean.includes("%") ? "%" : "");
    return `${increment.includes("+") ? "+" : ""}${value}`;
};
