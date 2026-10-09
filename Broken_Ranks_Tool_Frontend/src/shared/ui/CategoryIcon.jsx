import "./category-icon.css";
import drifDefensive from "../../assets/ui/drif-defensive.webp";
import drifOffensive from "../../assets/ui/drif-offensive.webp";
import drifUtility from "../../assets/ui/drif-utility.webp";
import orbDefensive from "../../assets/ui/orb-defensive.webp";
import orbOffensive from "../../assets/ui/orb-offensive.webp";
import orbUtility from "../../assets/ui/orb-utility.webp";

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
            decoding="async"
        />
    );
};

export default CategoryIcon;
