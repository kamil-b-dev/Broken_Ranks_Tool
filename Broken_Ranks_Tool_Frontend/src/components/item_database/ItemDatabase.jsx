import { useMemo, useState } from "react";
import { useItemDatabaseFilters } from "../../hooks/useItemDatabaseFilters";
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
    const handleDragStart = (event, item, type) =>
        event.dataTransfer.setData("application/json", JSON.stringify({ ...item, dragType: type }));
    const showTooltip = (event, item, type) =>
        setTooltip({ show: true, x: event.clientX + 15, y: event.clientY + 15, item, type });
    const hideTooltip = () => setTooltip({ show: false, x: 0, y: 0, item: null, type: "item" });

    return (
        <div className="item-database-theme bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex h-full min-h-0 flex-col relative">
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
            />
            <ItemDatabaseTooltip
                tooltip={tooltip}
                bonusTranslations={bonusTranslations}
                drifBasePowers={drifBasePowers}
            />
        </div>
    );
};

export default ItemDatabase;
