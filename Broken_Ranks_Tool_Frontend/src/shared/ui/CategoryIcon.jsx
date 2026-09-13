import drifDefensive from "../../assets/category-icons/drif-defensive.webp";
import drifOffensive from "../../assets/category-icons/drif-offensive.webp";
import drifUtility from "../../assets/category-icons/drif-utility.webp";
import orbDefensive from "../../assets/category-icons/orb-defensive.webp";
import orbOffensive from "../../assets/category-icons/orb-offensive.webp";
import orbUtility from "../../assets/category-icons/orb-utility.webp";

const CATEGORY_ICONS = {
    orb: {
        OFFENSIVE: orbOffensive,
        DEFENSIVE: orbDefensive,
        UTILITY: orbUtility,
    },
    drif: {
        OFFENSIVE: drifOffensive,
        DEFENSIVE: drifDefensive,
        UTILITY: drifUtility,
    },
};

const normalizeKind = (kind) => {
    if (kind === "orbs") return "orb";
    if (kind === "drifs") return "drif";
    return kind;
};

const getCategoryIconSource = (kind, category) =>
    CATEGORY_ICONS[normalizeKind(kind)]?.[String(category || "").toUpperCase()] || null;

/** Displays the shared category artwork used by orb and drif controls. */
const CategoryIcon = ({ kind, category, className = "", fallback = null }) => {
    const source = getCategoryIconSource(kind, category);
    if (!source) return fallback;

    return (
        <img
            src={source}
            className={`category-artwork ${className}`.trim()}
            alt=""
            aria-hidden="true"
            draggable="false"
        />
    );
};

export default CategoryIcon;
