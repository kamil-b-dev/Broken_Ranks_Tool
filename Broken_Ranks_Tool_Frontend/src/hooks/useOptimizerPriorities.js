import { useMemo, useState } from "react";
import {
    createBonusOption,
    sortBonusesByCategory,
} from "../components/optimization/optimizerDomain";

const createPriority = (bonus) => ({
    ...bonus,
    weight: 15,
    min: 0,
    max: 12,
    forceCap: false,
    forcePercentage: false,
    forcedPercentage: "",
    maximize: false,
});

/** Owns available modifiers, configured priorities, filtering, ordering, and card expansion. */
export const useOptimizerPriorities = (gameRules) => {
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [prioritySortDirection, setPrioritySortDirection] = useState("desc");
    const [expandedPriorities, setExpandedPriorities] = useState(new Set());

    const allBonuses = useMemo(() => {
        if (!gameRules?.bonusTranslations) return [];
        return sortBonusesByCategory(
            Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) =>
                    createBonusOption([key, value], gameRules.drifBonusCategories)
                )
                .filter((bonus) => gameRules.drifBasePowers[bonus.key] !== undefined)
        );
    }, [gameRules]);

    const filteredAvailableBonuses = useMemo(
        () =>
            allBonuses.filter((bonus) => {
                if (prioritizedBonuses.some((priority) => priority.key === bonus.key)) return false;
                const matchesCategory =
                    selectedCategory === "ALL" || bonus.categoryKey === selectedCategory;
                const matchesSearch = bonus.value.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCategory && matchesSearch;
            }),
        [allBonuses, prioritizedBonuses, searchQuery, selectedCategory]
    );

    const selectBonus = (bonus) => {
        setPrioritizedBonuses((previous) => [...previous, createPriority(bonus)]);
        setExpandedPriorities(new Set([bonus.key]));
    };

    const removeBonus = (bonus) => {
        setPrioritizedBonuses((previous) => previous.filter((item) => item.key !== bonus.key));
        setExpandedPriorities((previous) => {
            const next = new Set(previous);
            next.delete(bonus.key);
            return next;
        });
    };

    const clearAll = () => {
        setPrioritizedBonuses([]);
        setExpandedPriorities(new Set());
    };

    const updateBonus = (key, field, value) => {
        setPrioritizedBonuses((previous) =>
            previous.map((bonus) => {
                if (bonus.key !== key) return bonus;
                if (field === "forceCap" && value) {
                    return { ...bonus, forceCap: true, forcePercentage: false };
                }
                if (field === "forcePercentage" && value) {
                    return { ...bonus, forcePercentage: true, forceCap: false, maximize: false };
                }
                if (field === "maximize" && value) {
                    return { ...bonus, maximize: true, forcePercentage: false };
                }
                return { ...bonus, [field]: value };
            })
        );
    };

    const sortByPriority = () => {
        setPrioritizedBonuses((previous) => {
            const direction = prioritySortDirection === "desc" ? 1 : -1;
            return previous
                .map((bonus, index) => ({ bonus, index }))
                .sort((left, right) => {
                    const difference =
                        (Number(right.bonus.weight) - Number(left.bonus.weight)) * direction;
                    return difference || left.index - right.index;
                })
                .map(({ bonus }) => bonus);
        });
        setPrioritySortDirection((previous) => (previous === "desc" ? "asc" : "desc"));
    };

    const toggleExpanded = (key) => {
        setExpandedPriorities((previous) => {
            const next = new Set(previous);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleAllExpanded = () => {
        setExpandedPriorities((previous) =>
            previous.size > 0 ? new Set() : new Set(prioritizedBonuses.map((bonus) => bonus.key))
        );
    };

    const replaceConfiguration = ({ priorities }) => {
        setPrioritizedBonuses(priorities);
        setExpandedPriorities(priorities.length > 0 ? new Set([priorities[0].key]) : new Set());
    };

    return {
        prioritizedBonuses,
        availableBonuses: filteredAvailableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleExpanded,
        toggleAllExpanded,
        replaceConfiguration,
    };
};
