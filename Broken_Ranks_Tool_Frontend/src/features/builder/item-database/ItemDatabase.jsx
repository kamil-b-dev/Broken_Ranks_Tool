import { setDraggedResource } from "../useDraggedResource";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useItemDatabaseFilters } from "./useItemDatabaseFilters";
import ItemDatabaseControls from "./ItemDatabaseControls";
import { buildItemDatabaseGroups, filterItemDatabaseGroups } from "./itemDatabaseDomain";
import ItemDatabaseResults from "./ItemDatabaseResults";
import ItemDatabaseTooltip from "./ItemDatabaseTooltip";

/** Provides searchable equipment data and drag-and-drop selection. */
const ItemDatabase = ({
    items = [],
    orbs = [],
    drifs = [],
    categoryNames = {},
    orbCategories = {},
    drifCategories = {},
    gameRules = {},
}) => {
    const { activeTab, filters, setFilter, clearFilters, changeTab, hasActiveFilters } =
        useItemDatabaseFilters();
    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, item: null, type: "item" });
    const tooltipId = useId();
    const tooltipElement = useRef(null);
    const hovered = useRef(null);
    const position = useRef(null);
    const frame = useRef(null);
    useEffect(
        () => () => {
            if (frame.current != null) cancelAnimationFrame(frame.current);
        },
        []
    );
    const { bonusTranslations = {}, drifBasePowers = {} } = gameRules;
    const { groupedData, allCategories, allTiers, allStats } = useMemo(
        () => buildItemDatabaseGroups({ activeTab, items, orbs, drifs, categoryNames }),
        [activeTab, items, orbs, drifs, categoryNames]
    );
    const filteredGroups = useMemo(
        () =>
            filterItemDatabaseGroups({
                groupedData,
                activeTab,
                filters,
                bonusTranslations,
                drifBasePowers,
            }),
        [groupedData, activeTab, filters, bonusTranslations, drifBasePowers]
    );
    const hideTooltip = useCallback((event) => {
        if (event?.type === "mouseleave" && hovered.current?.keyboard) return;
        hovered.current = null;
        if (frame.current != null) cancelAnimationFrame(frame.current);
        frame.current = null;
        setTooltip((previous) => (previous.show ? { ...previous, show: false } : previous));
    }, []);
    const handleDragStart = useCallback(
        (event, item, type) => {
            const resource = { ...item, dragType: type };
            event.dataTransfer.setData("application/json", JSON.stringify(resource));
            setDraggedResource(resource);
            hideTooltip();
        },
        [hideTooltip]
    );
    const showTooltip = useCallback((event, item, type) => {
        if (event.type === "mousemove" && hovered.current?.keyboard) return;
        const keyboard = event.type === "focus";
        const rect = keyboard ? event.currentTarget.getBoundingClientRect() : null;
        const next = {
            show: true,
            x: Math.max(
                0,
                Math.min(keyboard ? rect.left : event.clientX + 15, window.innerWidth - 272)
            ),
            y: Math.max(
                0,
                Math.min(keyboard ? rect.bottom : event.clientY + 15, window.innerHeight - 340)
            ),
            item,
            type,
            keyboard,
        };
        const previous = hovered.current;
        hovered.current = next;
        if (
            !previous ||
            previous.item !== item ||
            previous.type !== type ||
            previous.keyboard !== keyboard
        ) {
            setTooltip(next);
        }
        position.current = { x: next.x, y: next.y };
        if (frame.current == null)
            frame.current = requestAnimationFrame(() => {
                frame.current = null;
                if (tooltipElement.current && position.current) {
                    tooltipElement.current.style.transform = `translate3d(${position.current.x}px, ${position.current.y}px, 0)`;
                }
            });
    }, []);
    const resultKey = useMemo(
        () => `${activeTab}:${JSON.stringify(filters)}`,
        [activeTab, filters]
    );

    return (
        <div
            onDragEnd={() => setDraggedResource(null)}
            className="item-database-theme bg-linear-to-b from-stone-900 to-black p-6 border-2 border-stone-800 optimizer-info-divider shadow-[0_0_30px_rgba(0,0,0,0.9)] flex h-full min-h-0 flex-col relative"
            onKeyDown={(event) => {
                if (event.key === "Escape") hideTooltip();
            }}
        >
            <ItemDatabaseControls
                activeTab={activeTab}
                filters={filters}
                hasActiveFilters={hasActiveFilters}
                allCategories={allCategories}
                allTiers={allTiers}
                allStats={allStats}
                orbCategories={orbCategories}
                drifCategories={drifCategories}
                onTabChange={changeTab}
                onFilterChange={setFilter}
                onClearFilters={clearFilters}
            />
            <ItemDatabaseResults
                key={resultKey}
                groups={filteredGroups}
                activeTab={activeTab}
                bonusTranslations={bonusTranslations}
                onDragStart={handleDragStart}
                onHover={showTooltip}
                onLeave={hideTooltip}
                onClearFilters={clearFilters}
                tooltipId={tooltipId}
                activeDetailsKey={tooltip.show ? `${tooltip.type}:${tooltip.item.id}` : null}
            />
            <ItemDatabaseTooltip
                elementRef={tooltipElement}
                tooltip={tooltip}
                bonusTranslations={bonusTranslations}
                drifBasePowers={drifBasePowers}
                id={tooltipId}
            />
        </div>
    );
};

export default memo(ItemDatabase);
