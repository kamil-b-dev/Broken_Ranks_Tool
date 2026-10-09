import { setDraggedResource } from "../useDraggedResource";
import { useId, useMemo, useState } from "react";
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
    const handleDragStart = (event, item, type) => {
        const resource = { ...item, dragType: type };
        event.dataTransfer.setData("application/json", JSON.stringify(resource));
        setDraggedResource(resource);
        hideTooltip();
    };
    const showTooltip = (event, item, type) => {
        if (event.type === "mousemove" && tooltip.keyboard) return;
        const keyboard = event.type === "focus";
        const rect = keyboard ? event.currentTarget.getBoundingClientRect() : null;
        setTooltip({
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
        });
    };
    const hideTooltip = (event) => {
        if (event?.type === "mouseleave" && tooltip.keyboard) return;
        setTooltip({ show: false, x: 0, y: 0, item: null, type: "item" });
    };

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
                tooltip={tooltip}
                bonusTranslations={bonusTranslations}
                drifBasePowers={drifBasePowers}
                id={tooltipId}
            />
        </div>
    );
};

export default ItemDatabase;
