import { memo, useMemo, useRef, useState } from "react";

import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { getEquipmentIconClass, getRarityColor, getVariantLabel } from "./itemDatabasePresentation";

const detailsProps = (item, type, onHover, onLeave, tooltipId, activeDetailsKey) => ({
    type: "button",
    "aria-label":
        `Szczegóły: ${item.name || item.description || item.bonusType} ${item.size || item.tier || ""}`.trim(),
    "aria-describedby": activeDetailsKey === `${type}:${item.id}` ? tooltipId : undefined,
    onFocus: (event) => onHover(event, item, type),
    onBlur: onLeave,
    onClick: (event) => onHover({ type: "focus", currentTarget: event.currentTarget }, item, type),
});

const ItemRow = memo(
    ({ item, category, onDragStart, onHover, onLeave, tooltipId, activeDetailsKey }) => (
        <li
            draggable
            onDragStart={(event) => onDragStart(event, item, "items")}
            onMouseMove={(event) => onHover(event, item, "items")}
            onMouseLeave={onLeave}
            className="database-result-row p-1.5 transition-colors flex justify-between items-center group cursor-grab active:cursor-grabbing hover:bg-stone-900/50 border-b border-stone-800/50 optimizer-info-divider"
        >
            <button
                {...detailsProps(item, "items", onHover, onLeave, tooltipId, activeDetailsKey)}
                className="database-item-copy text-left focus-visible:outline-2 focus-visible:outline-amber-500"
            >
                <span className={`truncate font-serif ${getRarityColor(item.rarity)}`}>
                    {item.name || item.description || item.bonusType}
                </span>
                <small>{category}</small>
            </button>
            <div className="flex items-center gap-2 shrink-0">
                {item.tier && (
                    <span className="text-[10px] text-stone-400 font-serif font-bold border border-stone-800/50 optimizer-info-divider px-1.5 py-0.5 bg-black">
                        {item.tier}
                    </span>
                )}
                <span className="text-stone-600 font-serif text-[11px] group-hover:text-stone-400 transition-colors w-10 text-right">
                    Lvl {item.reqLevel || "?"}
                </span>
            </div>
        </li>
    )
);

const VariantRow = memo(
    ({
        variants,
        type,
        bonusTranslations,
        onDragStart,
        onHover,
        onLeave,
        tooltipId,
        activeDetailsKey,
    }) => {
        const baseItem = variants[0];
        return (
            <li className="database-result-row database-variant-row p-1.5 flex justify-between items-center gap-2 hover:bg-stone-900/50 transition-colors border-b border-stone-800/50 optimizer-info-divider">
                <CategoryIcon
                    kind={type}
                    category={baseItem.category}
                    className={`database-bonus-icon database-bonus-icon-${type}`}
                    fallback={
                        <span
                            className={`database-bonus-icon database-bonus-icon-${type}`}
                            aria-hidden="true"
                        />
                    }
                />
                <button
                    {...detailsProps(baseItem, type, onHover, onLeave, tooltipId, activeDetailsKey)}
                    className="truncate flex-1 cursor-help flex items-center gap-1.5"
                    onMouseMove={(event) => onHover(event, baseItem, type)}
                    onMouseLeave={onLeave}
                >
                    {baseItem.name && (
                        <span
                            className={`font-serif font-bold bg-clip-text text-transparent bg-linear-to-r ${type === "orbs" ? "from-red-400 to-rose-600" : "from-orange-400 to-amber-600"}`}
                        >
                            {baseItem.name}
                        </span>
                    )}
                    <span className="text-stone-400 font-serif text-xs">
                        {bonusTranslations[baseItem.bonusType] || baseItem.bonusType || ""}
                    </span>
                </button>
                <div className="flex gap-1 shrink-0">
                    {variants.map((variant) => (
                        <button
                            key={variant.id}
                            {...detailsProps(
                                variant,
                                type,
                                onHover,
                                onLeave,
                                tooltipId,
                                activeDetailsKey
                            )}
                            draggable
                            onDragStart={(event) => onDragStart(event, variant, type)}
                            onMouseMove={(event) => onHover(event, variant, type)}
                            onMouseLeave={onLeave}
                            className={`w-7 h-7 flex items-center justify-center font-serif text-[12px] font-bold cursor-grab active:cursor-grabbing transition-colors shadow-inner border ${type === "orbs" ? "bg-black text-rose-700 builder-accent-text border-rose-900/50 builder-accent-frame hover:bg-rose-950/40 builder-accent-surface hover:text-red-500 optimizer-lock-text hover:border-rose-700 " : "bg-black text-orange-600 border-orange-900/50 hover:bg-amber-950/30 hover:text-amber-500 hover:border-orange-500"}`}
                            title={variant.size || variant.tier}
                        >
                            {getVariantLabel(variant)}
                        </button>
                    ))}
                </div>
            </li>
        );
    }
);

const ItemDatabaseResults = ({
    groups,
    activeTab,
    bonusTranslations,
    onDragStart,
    onHover,
    onLeave,
    onClearFilters,
    tooltipId,
    activeDetailsKey,
}) => {
    const [page, setPage] = useState(0);
    const list = useRef(null);
    const total = Object.values(groups).reduce((sum, entries) => sum + entries.length, 0);
    const pageCount = Math.ceil(total / 60);
    const currentPage = Math.min(page, Math.max(0, pageCount - 1));
    const pageGroups = useMemo(() => {
        let skip = currentPage * 60;
        let remaining = 60;
        const result = [];
        for (const [category, entries] of Object.entries(groups).sort()) {
            if (skip >= entries.length) {
                skip -= entries.length;
                continue;
            }
            const visible = entries.slice(skip, skip + remaining);
            skip = 0;
            remaining -= visible.length;
            if (visible.length) result.push([category, visible]);
        }
        return result;
    }, [groups, currentPage]);
    const changePage = (next) => {
        setPage(next);
        list.current?.scrollTo?.({ top: 0, behavior: "instant" });
    };
    return (
        <div ref={list} className="min-h-0 flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {pageCount > 1 && (
                <nav className="database-pagination" aria-label="Strony bazy przedmiotów">
                    <button
                        type="button"
                        disabled={currentPage === 0}
                        onClick={() => changePage(currentPage - 1)}
                    >
                        Poprzednia
                    </button>
                    <span aria-live="polite">
                        {currentPage + 1} / {pageCount}
                    </span>
                    <button
                        type="button"
                        disabled={currentPage === pageCount - 1}
                        onClick={() => changePage(currentPage + 1)}
                    >
                        Następna
                    </button>
                </nav>
            )}
            {pageGroups.map(([category, entries]) => (
                <div key={category}>
                    <h4 className="database-category-heading text-stone-500 font-serif font-bold mb-2 text-xs uppercase tracking-[0.2em]">
                        <span
                            className={`database-category-icon equipment-slot-icon equipment-slot-icon-${activeTab === "items" ? getEquipmentIconClass(category) : "ring1"}`}
                            aria-hidden="true"
                        />
                        {category}
                    </h4>
                    <ul className="text-sm space-y-1 pl-2 border-l border-stone-800 optimizer-info-divider">
                        {entries.map((entry, index) =>
                            activeTab === "items" ? (
                                <ItemRow
                                    key={entry.id}
                                    item={entry}
                                    category={category}
                                    onDragStart={onDragStart}
                                    onHover={onHover}
                                    onLeave={onLeave}
                                    tooltipId={tooltipId}
                                    activeDetailsKey={
                                        activeDetailsKey === `items:${entry.id}`
                                            ? activeDetailsKey
                                            : null
                                    }
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
                                    tooltipId={tooltipId}
                                    activeDetailsKey={
                                        entry.some(
                                            (variant) =>
                                                activeDetailsKey === `${activeTab}:${variant.id}`
                                        )
                                            ? activeDetailsKey
                                            : null
                                    }
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
                        className="text-rose-800 builder-accent-text hover:text-rose-600 text-sm font-serif border border-stone-700 px-3 py-1 bg-black/60 shadow-inner"
                    >
                        Zresetuj filtry
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(ItemDatabaseResults);
