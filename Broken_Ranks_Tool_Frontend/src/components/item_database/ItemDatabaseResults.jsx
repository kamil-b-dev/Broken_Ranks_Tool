import { getRarityColor, getVariantLabel } from "./itemDatabasePresentation";

const ItemRow = ({ item, onDragStart, onHover, onLeave }) => (
    <li
        draggable
        onDragStart={(event) => onDragStart(event, item, "items")}
        onMouseMove={(event) => onHover(event, item, "items")}
        onMouseLeave={onLeave}
        className="p-1.5 transition-colors flex justify-between items-center group cursor-grab active:cursor-grabbing hover:bg-stone-900/50 border-b border-stone-800/50"
    >
        <span className={`truncate mr-2 font-serif ${getRarityColor(item.rarity)}`}>
            {item.name || item.description || item.bonusType}
        </span>
        <div className="flex items-center gap-2 shrink-0">
            {item.tier && (
                <span className="text-[10px] text-stone-400 font-serif font-bold border border-stone-800/50 px-1.5 py-0.5 bg-black">
                    {item.tier}
                </span>
            )}
            <span className="text-stone-600 font-serif text-[11px] group-hover:text-stone-400 transition-colors w-10 text-right">
                Lvl {item.reqLevel || "?"}
            </span>
        </div>
    </li>
);

const VariantRow = ({ variants, type, bonusTranslations, onDragStart, onHover, onLeave }) => {
    const baseItem = variants[0];
    return (
        <li className="p-1.5 flex justify-between items-center gap-2 hover:bg-stone-900/50 transition-colors border-b border-stone-800/50">
            <span
                className="truncate flex-1 cursor-help flex items-center gap-1.5"
                onMouseMove={(event) => onHover(event, baseItem, type)}
                onMouseLeave={onLeave}
            >
                {baseItem.name && (
                    <span
                        className={`font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r ${type === "orbs" ? "from-red-400 to-rose-600" : "from-orange-400 to-amber-600"}`}
                    >
                        {baseItem.name}
                    </span>
                )}
                <span className="text-stone-400 font-serif text-xs">
                    {bonusTranslations[baseItem.bonusType] || baseItem.bonusType || ""}
                </span>
            </span>
            <div className="flex gap-1 shrink-0">
                {variants.map((variant) => (
                    <div
                        key={variant.id}
                        draggable
                        onDragStart={(event) => onDragStart(event, variant, type)}
                        onMouseMove={(event) => onHover(event, variant, type)}
                        onMouseLeave={onLeave}
                        className={`w-7 h-7 flex items-center justify-center font-serif text-[12px] font-bold cursor-grab active:cursor-grabbing transition-colors shadow-inner border ${type === "orbs" ? "bg-black text-rose-700 border-rose-900/50 hover:bg-rose-950/40 hover:text-red-500 hover:border-rose-700" : "bg-black text-orange-600 border-orange-900/50 hover:bg-amber-950/30 hover:text-amber-500 hover:border-orange-500"}`}
                        title={variant.size || variant.tier}
                    >
                        {getVariantLabel(variant)}
                    </div>
                ))}
            </div>
        </li>
    );
};

const ItemDatabaseResults = ({
    groups,
    activeTab,
    bonusTranslations,
    onDragStart,
    onHover,
    onLeave,
    onClearFilters,
}) => (
    <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
        {Object.entries(groups)
            .sort()
            .map(([category, entries]) => (
                <div key={category}>
                    <h4 className="database-category-heading text-stone-500 font-serif font-bold mb-2 text-xs uppercase tracking-[0.2em]">
                        {category}
                    </h4>
                    <ul className="text-sm space-y-1 pl-2 border-l border-stone-800">
                        {entries.map((entry, index) =>
                            activeTab === "items" ? (
                                <ItemRow
                                    key={entry.id}
                                    item={entry}
                                    onDragStart={onDragStart}
                                    onHover={onHover}
                                    onLeave={onLeave}
                                />
                            ) : (
                                <VariantRow
                                    key={entry[0]?.id || index}
                                    variants={entry}
                                    type={activeTab}
                                    bonusTranslations={bonusTranslations}
                                    onDragStart={onDragStart}
                                    onHover={onHover}
                                    onLeave={onLeave}
                                />
                            )
                        )}
                    </ul>
                </div>
            ))}
        {Object.keys(groups).length === 0 && (
            <div className="text-center mt-10">
                <p className="text-stone-600 font-serif italic text-sm mb-2">
                    Brak wyników spełniających kryteria.
                </p>
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-rose-800 hover:text-rose-600 text-sm font-serif border border-stone-700 px-3 py-1 bg-black/60 shadow-inner"
                >
                    Zresetuj filtry
                </button>
            </div>
        )}
    </div>
);

export default ItemDatabaseResults;
