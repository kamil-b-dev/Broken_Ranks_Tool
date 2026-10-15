import { useCallback, useMemo, useState } from "react";
import {
    createBonusOption,
    resolveDrifCategoryKey,
    sortBonusesByCategory,
    DRIF_CATEGORY_ORDER,
} from "./optimizerDomain";

const createPriority = (bonus) => ({
    ...bonus,
    weight: 15,
    min: 0,
    max: 12,
    forceCap: false,
    forcePercentage: false,
    forcedPercentage: "",
    maximize: false,
    sizeRanges: {},
});

/** Owns available modifiers, configured priorities, filtering, ordering, and card expansion. */
export const useOptimizerPriorities = (gameRules, labels) => {
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [prioritySortDirection, setPrioritySortDirection] = useState("desc");
    const [categorySorted, setCategorySorted] = useState(false);
    const [hiddenPriorityCategories, setHiddenPriorityCategories] = useState(new Set());
    const [expandedPriorities, setExpandedPriorities] = useState(new Set());

    const displayedPriorities = useMemo(() => {
        const ordered = categorySorted
            ? sortBonusesByCategory(
                  prioritizedBonuses.map((bonus) => ({
                      ...bonus,
                      value: labels?.getName(bonus.key, bonus.value) || bonus.value,
                      categoryKey: resolveDrifCategoryKey(
                          bonus.key,
                          gameRules?.drifBonusCategories
                      ),
                  }))
              )
            : prioritizedBonuses;
        return ordered.filter(
            (bonus) =>
                !hiddenPriorityCategories.has(
                    resolveDrifCategoryKey(bonus.key, gameRules?.drifBonusCategories)
                )
        );
    }, [categorySorted, gameRules, hiddenPriorityCategories, labels, prioritizedBonuses]);

    const priorityCategoryCounts = useMemo(() => {
        const counts = Object.fromEntries(DRIF_CATEGORY_ORDER.map((category) => [category, 0]));
        prioritizedBonuses.forEach((bonus) => {
            const category = resolveDrifCategoryKey(bonus.key, gameRules?.drifBonusCategories);
            if (category in counts) counts[category] += 1;
        });
        return counts;
    }, [gameRules, prioritizedBonuses]);

    const togglePriorityCategory = useCallback((category) => {
        if (!DRIF_CATEGORY_ORDER.includes(category)) return;
        setHiddenPriorityCategories((previous) => {
            const next = new Set(previous);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    }, []);
    const showAllPriorityCategories = useCallback(() => setHiddenPriorityCategories(new Set()), []);

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
                const query = searchQuery.toLocaleLowerCase("pl");
                const matchesSearch = [bonus.value, labels?.searchName(bonus.key)].some((name) =>
                    name?.toLocaleLowerCase("pl").includes(query)
                );
                return matchesCategory && matchesSearch;
            }),
        [allBonuses, labels, prioritizedBonuses, searchQuery, selectedCategory]
    );

    const selectBonus = useCallback((bonus) => {
        setPrioritizedBonuses((previous) => [...previous, createPriority(bonus)]);
        setExpandedPriorities((previous) => new Set([...previous, bonus.key]));
    }, []);

    const removeBonus = useCallback((bonus) => {
        setPrioritizedBonuses((previous) => previous.filter((item) => item.key !== bonus.key));
        setExpandedPriorities((previous) => {
            const next = new Set(previous);
            next.delete(bonus.key);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setPrioritizedBonuses([]);
        setExpandedPriorities(new Set());
    }, []);

    const updateBonus = useCallback((key, field, value) => {
        setPrioritizedBonuses((previous) =>
            previous.map((bonus) => {
                if (bonus.key !== key) return bonus;
                if (Object.is(bonus[field], value)) return bonus;
                if (field === "forceCap" && value) {
                    return { ...bonus, forceCap: true, forcePercentage: false, maximize: false };
                }
                if (field === "forcePercentage" && value) {
                    return { ...bonus, forcePercentage: true, forceCap: false, maximize: false };
                }
                if (field === "maximize" && value) {
                    return { ...bonus, maximize: true, forcePercentage: false, forceCap: false };
                }
                return { ...bonus, [field]: value };
            })
        );
    }, []);

    const sortByPriority = () => {
        setCategorySorted(false);
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

    const toggleCategorySorting = () => setCategorySorted((previous) => !previous);

    const toggleExpanded = useCallback((key) => {
        setExpandedPriorities((previous) => {
            const next = new Set(previous);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const toggleAllExpanded = () => {
        setExpandedPriorities((previous) =>
            previous.size > 0 ? new Set() : new Set(prioritizedBonuses.map((bonus) => bonus.key))
        );
    };

    const replaceConfiguration = useCallback(({ priorities }) => {
        setPrioritizedBonuses(priorities);
        setExpandedPriorities(new Set(priorities.map((priority) => priority.key)));
    }, []);

    return {
        prioritizedBonuses,
        displayedPriorities,
        availableBonuses: filteredAvailableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        categorySorted,
        hiddenPriorityCategories,
        priorityCategoryCounts,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleCategorySorting,
        togglePriorityCategory,
        showAllPriorityCategories,
        toggleExpanded,
        toggleAllExpanded,
        replaceConfiguration,
    };
};
