import { doubleIncrement, getRarityColor } from "./itemDatabasePresentation";

const ItemStats = ({ item }) =>
    item.stats && Object.keys(item.stats).length > 0 ? (
        Object.entries(item.stats).map(([name, value]) => (
            <div
                key={name}
                className="flex justify-between text-xs my-1 border-b border-stone-800/50 pb-1"
            >
                <span className="text-stone-400 font-serif uppercase tracking-wider">{name}</span>
                <span className="text-stone-300 font-bold font-serif">+{value}</span>
            </div>
        ))
    ) : (
        <p className="text-xs text-stone-600 font-serif italic mt-2">Brak statystyk bazowych.</p>
    );

const DrifDetails = ({ item, basePowers }) => (
    <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
        <div className="flex justify-between border-b border-stone-800/50 pb-1">
            <span className="text-stone-500">Wartość bazowa:</span>
            <span className="text-stone-300 font-bold">{item.baseValue || "?"}</span>
        </div>
        <div className="flex justify-between border-b border-stone-800/50 pb-1">
            <span className="text-stone-500">Przyrost co lvl:</span>
            <span className="text-orange-500 font-bold">{item.increment || "?"}</span>
        </div>
        <div className="text-[10px] text-orange-600/70 italic mb-2 text-right">
            Arcydrif (19-21 lvl): przyrost x2 ({doubleIncrement(item.increment)})
        </div>
        <div className="flex justify-between mb-2 pb-1 border-b-2 border-double border-rose-900/30">
            <span className="text-stone-500">Potęga bazowa:</span>
            <span className="text-orange-400 font-bold">
                {basePowers[item.bonusType] || "?"} pkt
            </span>
        </div>
        <div className="text-stone-600 font-bold mb-1 uppercase tracking-widest text-[10px]">
            Mnożniki pojemności:
        </div>
        {[
            ["Subdrif (Lvl 1-6):", "x1"],
            ["Bidrif (Lvl 7-11):", "x2"],
            ["Magnidrif (Lvl 12-16):", "x3"],
            ["Arcydrif (Lvl 17-21):", "x4"],
        ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-stone-400">
                <span>{label}</span>
                <span className={value === "x4" ? "text-orange-500" : "text-stone-300"}>
                    {value}
                </span>
            </div>
        ))}
    </div>
);

const OrbDetails = ({ item }) => (
    <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
        {[
            [1, "text-rose-700"],
            [2, "text-rose-600"],
            [3, "text-rose-500"],
        ].map(([level, color]) => (
            <div
                key={level}
                className={`flex justify-between ${level === 3 ? "mb-2 pb-2 border-b-2 border-double border-rose-900/30" : "border-b border-stone-800/50 pb-1"}`}
            >
                <span className="text-stone-500">Bonus Lvl {level}:</span>
                <span className={`${color} font-bold`}>{item[`bonusLvl${level}`] || "?"}</span>
            </div>
        ))}
        <div className="text-[10px] text-stone-600 italic text-center mt-1">
            Przeciągnij kwadracik bezpośrednio na okienko z przedmiotem.
        </div>
    </div>
);

const ItemDatabaseTooltip = ({ tooltip, bonusTranslations, drifBasePowers }) => {
    if (!tooltip.show || !tooltip.item) return null;
    const { item, type } = tooltip;
    return (
        <div
            style={{ top: tooltip.y, left: tooltip.x }}
            className="fixed z-50 bg-gradient-to-b from-stone-900 to-black border border-stone-700 p-4 shadow-[0_0_20px_rgba(0,0,0,1)] pointer-events-none w-64"
        >
            <div className="flex justify-between items-start border-b-2 border-double border-rose-900/50 pb-2 mb-2">
                <h4
                    className={`text-base font-serif tracking-wide ${type === "items" ? getRarityColor(item.rarity) : `font-bold bg-clip-text text-transparent bg-gradient-to-r ${type === "orbs" ? "from-red-400 to-rose-600" : "from-orange-400 to-amber-600"}`}`}
                >
                    {type === "items" ? (
                        item.name
                    ) : (
                        <div className="flex flex-col">
                            {item.name && <span>{item.name}</span>}
                            <span className="text-stone-400 text-xs font-normal">
                                {bonusTranslations[item.bonusType] || item.bonusType}
                            </span>
                        </div>
                    )}
                </h4>
                {(item.tier || item.size) && (
                    <span
                        className={`text-xs font-serif font-bold mt-1 ml-2 ${type === "orbs" ? "text-rose-800" : "text-orange-600"}`}
                    >
                        {item.tier || item.size}
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
