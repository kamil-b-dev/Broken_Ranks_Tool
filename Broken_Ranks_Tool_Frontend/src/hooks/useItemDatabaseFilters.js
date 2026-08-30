import { useState } from "react";

const DEFAULT_FILTERS = {
    search: "",
    category: "Wszystkie",
    orbCategory: "Wszystkie",
    drifCategory: "Wszystkie",
    basePower: "",
    tier: "Wszystkie",
    stat: "Wszystkie",
};

/** Manages the active database section and its disposable filter state. */
export const useItemDatabaseFilters = () => {
    const [activeTab, setActiveTab] = useState("items");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
    const clearFilters = () => setFilters(DEFAULT_FILTERS);
    const changeTab = (tab) => {
        setActiveTab(tab);
        setFilters(DEFAULT_FILTERS);
    };
    const hasActiveFilters = Object.entries(filters).some(
        ([name, value]) => value !== DEFAULT_FILTERS[name]
    );

    return { activeTab, filters, setFilter, clearFilters, changeTab, hasActiveFilters };
};
