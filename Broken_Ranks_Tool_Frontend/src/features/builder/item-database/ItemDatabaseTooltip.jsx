import { useTranslation } from "../../../shared/i18n/useTranslation";
import { doubleIncrement } from "./itemDatabasePresentation";
import "../../../shared/styles/tooltips.css";

const ItemStats = ({ item }) => {
    const { t } = useTranslation();
    return item.stats && Object.keys(item.stats).length > 0 ? (
        Object.entries(item.stats).map(([name, value]) => (
            <div
                key={name}
                className="flex justify-between text-xs my-1 border-b border-stone-800/50 optimizer-info-divider pb-1"
            >
                <span className="text-stone-400 font-serif uppercase tracking-wider">
                    {t(name)}
                </span>
                <span className="text-stone-300 font-bold font-serif">+{t(value)}</span>
            </div>
        ))
    ) : (
        <p className="text-xs text-stone-600 font-serif italic mt-2">
            {t("Brak statystyk bazowych.")}
        </p>
    );
};

const DrifDetails = ({ item, basePowers }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
            <div className="flex justify-between border-b border-stone-800/50 optimizer-info-divider pb-1">
                <span className="text-stone-500">{t("Wartość bazowa:")}</span>
                <span className="text-stone-300 font-bold">{t(item.baseValue || "?")}</span>
            </div>
            <div className="flex justify-between border-b border-stone-800/50 optimizer-info-divider pb-1">
                <span className="text-stone-500">{t("Przyrost co lvl:")}</span>
                <span className="text-orange-500 font-bold">{t(item.increment || "?")}</span>
            </div>
            <div className="text-[10px] text-orange-600/70 italic mb-2 text-right">
                {t("Arcydrif (19-21 lvl): przyrost x2 (")}
                {t(doubleIncrement(item.increment))})
            </div>
            <div className="flex justify-between mb-2 pb-1 border-b-2 border-double border-rose-900/30 builder-accent-frame">
                <span className="text-stone-500">{t("Potęga bazowa:")}</span>
                <span className="text-orange-400 font-bold">
                    {t(basePowers[item.bonusType] || "?")}
                    {t(" pkt")}
                </span>
            </div>
            <div className="text-stone-600 font-bold mb-1 uppercase tracking-widest text-[10px]">
                {t("Mnożniki pojemności:")}
            </div>
            {[
                ["Subdrif (Lvl 1-6):", "x1"],
                ["Bidrif (Lvl 7-11):", "x2"],
                ["Magnidrif (Lvl 12-16):", "x3"],
                ["Arcydrif (Lvl 17-21):", "x4"],
            ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-stone-400">
                    <span>{t(label)}</span>
                    <span className={value === "x4" ? "text-orange-500" : "text-stone-300"}>
                        {t(value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

const OrbDetails = ({ item }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
            {[
                [1, "text-rose-700 builder-accent-text"],
                [2, "text-rose-600 builder-accent-text"],
                [3, "text-rose-500 builder-accent-text"],
            ].map(([level, color]) => (
                <div
                    key={level}
                    className={`flex justify-between ${level === 3 ? "mb-2 pb-2 border-b-2 border-double border-rose-900/30 builder-accent-frame" : "border-b border-stone-800/50 optimizer-info-divider pb-1"}`}
                >
                    <span className="text-stone-500">
                        {t("Bonus Lvl ")}
                        {t(level)}:
                    </span>
                    <span className={`${color} font-bold`}>
                        {t(item[`bonusLvl${level}`] || "?")}
                    </span>
                </div>
            ))}
            <div className="text-[10px] text-stone-600 italic text-center mt-1">
                {t("Przeciągnij kwadracik bezpośrednio na okienko z przedmiotem.")}
            </div>
        </div>
    );
};

const ItemDatabaseTooltip = ({ tooltip, bonusTranslations, drifBasePowers, id, elementRef }) => {
    const { t } = useTranslation();

    if (!tooltip.show || !tooltip.item) return null;
    const { item, type } = tooltip;
    return (
        <div
            ref={elementRef}
            id={id}
            role="tooltip"
            style={{ top: 0, left: 0, transform: `translate3d(${tooltip.x}px, ${tooltip.y}px, 0)` }}
            className="app-tooltip item-database-tooltip fixed z-50 p-4 pointer-events-none w-64"
        >
            <div className="app-tooltip-header flex justify-between items-start border-b-2 border-double pb-2 mb-2">
                <h4
                    className="app-tooltip-heading"
                    data-rarity={type === "items" ? item.rarity?.toUpperCase() : undefined}
                >
                    {type === "items" ? (
                        item.name
                    ) : (
                        <div className="flex flex-col">
                            {item.name && <span>{item.name}</span>}
                            <span className="text-stone-400 text-xs font-normal">
                                {t(bonusTranslations[item.bonusType] || item.bonusType)}
                            </span>
                        </div>
                    )}
                </h4>
                {(item.tier || item.size) && (
                    <span
                        className={`text-xs font-serif font-bold mt-1 ml-2 ${type === "orbs" ? "text-rose-800 builder-accent-text" : "text-orange-600"}`}
                    >
                        {t(item.tier || item.size)}
                    </span>
                )}
            </div>
            {type === "items" && <ItemStats item={item} />}
            {type === "drifs" && <DrifDetails item={item} basePowers={drifBasePowers} />}
            {type === "orbs" && <OrbDetails item={item} />}
        </div>
    );
};

export default ItemDatabaseTooltip;
