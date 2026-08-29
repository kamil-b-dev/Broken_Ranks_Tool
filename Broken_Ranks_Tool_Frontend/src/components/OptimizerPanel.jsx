import React, { useState, useEffect, useMemo, useRef } from "react";
import { useEquipment } from "../context/EquipmentContext";
import { SLOTS } from "../constants/equipment";
import { ROMAN_TO_INT, SIZE_INDEX } from "../utils/GearRules";
import { getDrifMaxLvl } from "../utils/formatters";
import {
    calculateDrifValue,
    createBonusOption,
    ELEMENTAL_DRIF_TYPES,
    formatPotentialValue,
    getDrifPenaltyMultiplier,
    highestLevelForCapacity,
    ITEM_STAR_DRIF_BONUS,
    maxDrifSizeIndexForTier,
    numericStatValue,
    sortBonusesByCategory,
} from "./optimization/optimizerDomain";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    parseOptimizerConfigPayload,
} from "./optimization/optimizerConfiguration";
import OptimizerBonusColumn from "./optimization/OptimizerBonusColumn";
import OptimizerMobileNavigation from "./optimization/OptimizerMobileNavigation";
import OptimizerRunAction from "./optimization/OptimizerRunAction";

/**
 * Provides drif priorities, target limits, and equipment locking for optimization.
 * @returns {JSX.Element} The optimizer panel.
 */
const OptimizerPanel = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        applyOptimizationSetup,
    } = useEquipment();

    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationElapsedSeconds, setOptimizationElapsedSeconds] = useState(0);
    const [lastOptimizationDurationSeconds, setLastOptimizationDurationSeconds] = useState(null);
    const [optimizationStatus, setOptimizationStatus] = useState(null);
    const [activeVariantIndex, setActiveVariantIndex] = useState(0);
    const [prioritySortDirection, setPrioritySortDirection] = useState("desc");
    const [expandedPriorities, setExpandedPriorities] = useState(new Set());
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
    const configInputRef = useRef(null);
    const optimizationStartTimeRef = useRef(null);

    useEffect(() => {
        if (!isOptimizing) return undefined;

        const timerId = window.setInterval(() => {
            if (optimizationStartTimeRef.current === null) return;
            setOptimizationElapsedSeconds(
                Math.floor((performance.now() - optimizationStartTimeRef.current) / 1000)
            );
        }, 250);

        return () => window.clearInterval(timerId);
    }, [isOptimizing]);

    useEffect(() => {
        if (gameRules?.bonusTranslations) {
            const allBonuses = Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) =>
                    createBonusOption([key, value], gameRules.drifBonusCategories)
                )
                .filter((b) => gameRules.drifBasePowers[b.key] !== undefined);
            setAvailableBonuses(sortBonusesByCategory(allBonuses));
        }
    }, [gameRules, drifCategories]);

    const filteredAvailableBonuses = availableBonuses.filter((b) => {
        const matchesCategory = selectedCategory === "ALL" || b.categoryKey === selectedCategory;
        const matchesSearch = b.value.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const currentModDetails = useMemo(() => {
        const counts = {};
        const drifsById = new Map(data.drifs.map((drif) => [String(drif.id), drif]));
        const itemsById = new Map(data.items.map((item) => [String(item.id), item]));

        Object.values(requestData.slots || {}).forEach((slot) => {
            const typesInSlot = new Set();
            (slot?.drifIds || []).forEach((drifId) => {
                const drif = drifsById.get(String(drifId));
                if (drif?.bonusType && !typesInSlot.has(drif.bonusType)) {
                    typesInSlot.add(drif.bonusType);
                    counts[drif.bonusType] = (counts[drif.bonusType] || 0) + 1;
                }
            });
        });

        return prioritizedBonuses.map((bonus) => {
            const count = counts[bonus.key] || 0;
            const multiplier = getDrifPenaltyMultiplier(count, gameRules?.drifPenaltyMultipliers);
            const basePower = Number(gameRules?.drifBasePowers?.[bonus.key]) || 0;
            const isElemental = ELEMENTAL_DRIF_TYPES.includes(bonus.key);
            const matchingDrifs = data.drifs.filter((drif) => drif.bonusType === bonus.key);
            const eligiblePlacements = Object.entries(requestData.slots || {}).flatMap(
                ([slotKey, slot]) => {
                    const item = itemsById.get(String(slot?.itemId));
                    if (
                        !item ||
                        ["EPIC", "SET"].includes(String(item.rarity).toUpperCase()) ||
                        (isElemental && slotKey !== "weapon")
                    )
                        return [];

                    const tier = ROMAN_TO_INT[item.tier] || 0;
                    const maxSizeIndex = maxDrifSizeIndexForTier(tier);
                    const drif = matchingDrifs
                        .filter(
                            (candidate) =>
                                (SIZE_INDEX[String(candidate.size).toUpperCase()] ?? -1) <=
                                maxSizeIndex
                        )
                        .sort(
                            (left, right) => getDrifMaxLvl(right.size) - getDrifMaxLvl(left.size)
                        )[0];
                    if (!drif) return [];

                    const stars = Math.max(1, Math.min(9, Number(slot.itemStars) || 1));
                    const capacityBonus = stars === 7 ? 1 : stars === 8 ? 2 : stars === 9 ? 4 : 0;
                    const capacity = (Number(item.capacity) || 0) + capacityBonus;
                    if (capacity <= 0 || capacity < basePower) return [];

                    const itemDrifBonus =
                        (Number(item.stats?.["Bonus drify"]) || 0) / 100 +
                        (ITEM_STAR_DRIF_BONUS[stars] || 0);
                    return [
                        {
                            itemDrifBonus,
                            minimumValue:
                                calculateDrifValue(drif, Math.min(6, getDrifMaxLvl(drif.size))) *
                                (1 + itemDrifBonus),
                            maximumValue:
                                calculateDrifValue(
                                    drif,
                                    highestLevelForCapacity(drif, capacity, basePower)
                                ) *
                                (1 + itemDrifBonus),
                        },
                    ];
                }
            );

            const requestedMinimum = Math.max(0, Math.min(12, Number(bonus.min) || 0));
            const requestedMaximum = Math.max(
                requestedMinimum,
                Math.min(12, Number(bonus.max) || 0)
            );
            const minimumPlacements = [...eligiblePlacements]
                .sort((left, right) => left.itemDrifBonus - right.itemDrifBonus)
                .slice(0, requestedMinimum);
            const maximumPlacements = [...eligiblePlacements]
                .sort((left, right) => right.itemDrifBonus - left.itemDrifBonus)
                .slice(0, requestedMaximum);
            const minimumPenalty = getDrifPenaltyMultiplier(
                minimumPlacements.length,
                gameRules?.drifPenaltyMultipliers
            );
            const maximumPenalty = getDrifPenaltyMultiplier(
                maximumPlacements.length,
                gameRules?.drifPenaltyMultipliers
            );
            return {
                ...bonus,
                count,
                penaltyPercent: Math.max(0, (1 - multiplier) * 100),
                potentialMinimum:
                    minimumPlacements.reduce((sum, placement) => sum + placement.minimumValue, 0) *
                    minimumPenalty,
                potentialMaximum:
                    maximumPlacements.reduce((sum, placement) => sum + placement.maximumValue, 0) *
                    maximumPenalty,
                potentialMinimumCount: minimumPlacements.length,
                potentialMaximumCount: maximumPlacements.length,
            };
        });
    }, [data.drifs, data.items, gameRules, prioritizedBonuses, requestData.slots]);

    /** Moves a selected bonus into the priority list. */
    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses((prev) => [
            ...prev,
            {
                ...bonus,
                weight: 15,
                min: 0,
                max: 12,
                forceCap: false,
                forcePercentage: false,
                forcedPercentage: "",
                maximize: false,
            },
        ]);
        setAvailableBonuses((prev) => prev.filter((b) => b.key !== bonus.key));
        setExpandedPriorities(new Set([bonus.key]));
        setActiveMobileColumn("priorities");
    };

    /** Removes a bonus from the priority list and restores it to available choices. */
    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses((prev) =>
            sortBonusesByCategory([
                ...prev,
                createBonusOption([bonus.key, bonus.value], gameRules?.drifBonusCategories),
            ])
        );
        setPrioritizedBonuses((prev) => prev.filter((b) => b.key !== bonus.key));
        setExpandedPriorities((prev) => {
            const next = new Set(prev);
            next.delete(bonus.key);
            return next;
        });
    };

    /** Clears all configured priorities. */
    const handleClearAll = () => {
        setAvailableBonuses((prev) => {
            const combined = [
                ...prev,
                ...prioritizedBonuses.map((b) =>
                    createBonusOption([b.key, b.value], gameRules?.drifBonusCategories)
                ),
            ];
            return sortBonusesByCategory(combined);
        });
        setPrioritizedBonuses([]);
        setExpandedPriorities(new Set());
    };

    /** Updates one field of a configured priority. */
    const handleUpdateBonus = (key, field, value) => {
        setPrioritizedBonuses((prev) =>
            prev.map((b) => {
                if (b.key === key) {
                    if (field === "forceCap" && value) {
                        return { ...b, forceCap: true, forcePercentage: false };
                    }
                    if (field === "forcePercentage" && value) {
                        return { ...b, forcePercentage: true, forceCap: false, maximize: false };
                    }
                    if (field === "maximize" && value) {
                        return { ...b, maximize: true, forcePercentage: false };
                    }
                    return { ...b, [field]: value };
                }
                return b;
            })
        );
    };

    /** Sorts priorities by weight while preserving tie order. */
    const handleSortByPriority = () => {
        setPrioritizedBonuses((prev) => {
            const direction = prioritySortDirection === "desc" ? 1 : -1;
            return prev
                .map((bonus, index) => ({ bonus, index }))
                .sort((left, right) => {
                    const weightDifference =
                        (Number(right.bonus.weight) - Number(left.bonus.weight)) * direction;
                    return weightDifference || left.index - right.index;
                })
                .map(({ bonus }) => bonus);
        });
        setPrioritySortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
    };

    const handleSaveConfiguration = () => {
        const payload = createOptimizerConfigPayload(prioritizedBonuses, optimizerSettings);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `broken-ranks-priorytety-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleLoadConfiguration = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("Plik konfiguracji jest zbyt duży.");
            return;
        }

        try {
            const payload = JSON.parse(await file.text());
            const imported = parseOptimizerConfigPayload(payload, gameRules);
            setPrioritizedBonuses(imported.priorities);
            setExpandedPriorities(
                imported.priorities.length > 0 ? new Set([imported.priorities[0].key]) : new Set()
            );
            setAvailableBonuses(imported.availableBonuses);
            if (imported.maxVariantLossPercent !== null) {
                onOptimizerSettingsChange((previous) => ({
                    ...previous,
                    maxVariantLossPercent: imported.maxVariantLossPercent,
                }));
            }
            alert(`Wczytano konfigurację: ${imported.priorities.length} priorytetów.`);
        } catch (error) {
            alert(
                `Nie udało się wczytać konfiguracji: ${error.message || "niepoprawny plik JSON."}`
            );
        }
    };

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;
        const invalidPercentageTarget = findInvalidPercentageTarget(prioritizedBonuses);
        if (invalidPercentageTarget) {
            alert(`Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`);
            return;
        }
        setIsOptimizing(true);
        setOptimizationElapsedSeconds(0);
        const startedAt = performance.now();
        optimizationStartTimeRef.current = startedAt;

        try {
            const result = await runDrifOptimization(
                buildOptimizationConfig(prioritizedBonuses, optimizerSettings)
            );
            setOptimizationStatus(result);
            setActiveVariantIndex(0);
        } finally {
            const durationSeconds = Math.floor((performance.now() - startedAt) / 1000);
            setOptimizationElapsedSeconds(durationSeconds);
            setLastOptimizationDurationSeconds(durationSeconds);
            optimizationStartTimeRef.current = null;
            setIsOptimizing(false);
        }
    };

    const togglePriorityExpanded = (key) => {
        setExpandedPriorities((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    return (
        <div className="optimizer-console bg-gradient-to-b from-stone-900 to-black p-3 sm:p-5 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={prioritizedBonuses.length}
                onChange={setActiveMobileColumn}
            />
            <div className="optimizer-main-grid grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
                <div
                    className={`optimizer-workspace-column optimizer-lock-column ${activeMobileColumn === "slots" ? "flex" : "hidden"} flex-col gap-2 lg:col-span-2 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
                >
                    <div className="flex items-center justify-center border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Zablokowane Sloty
                        </h4>
                    </div>

                    <div className="grid grid-cols-2 content-start gap-2 overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {SLOTS.map((slot) => {
                            const slotData = requestData.slots?.[slot.key];
                            const item = slotData?.itemId
                                ? data.items.find(
                                      (i) => i.id.toString() === slotData.itemId.toString()
                                  )
                                : null;
                            const isSlotLocked = lockedSlots?.includes(slot.key);

                            return (
                                <div
                                    key={slot.key}
                                    className={`flex flex-col min-w-0 bg-stone-950/60 border rounded-sm transition-all ${isSlotLocked ? "border-purple-700/60 shadow-[inset_0_0_15px_rgba(88,40,130,0.24)]" : "border-stone-800/80 hover:border-purple-800"}`}
                                >
                                    <div className="flex justify-between items-center bg-black/60 p-2 border-b border-stone-800/60">
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-widest ${isSlotLocked ? "text-red-500" : "text-stone-400"}`}
                                        >
                                            {slot.label}
                                        </span>
                                        {item && (
                                            <button
                                                onClick={() => toggleSlotLock(slot.key)}
                                                className={`p-1 rounded-sm transition-colors ${isSlotLocked ? "text-red-500 hover:text-red-400 bg-red-950/40" : "text-stone-600 hover:text-stone-300 bg-stone-900"}`}
                                                title={
                                                    isSlotLocked
                                                        ? "Odblokuj slot"
                                                        : "Zablokuj cały slot"
                                                }
                                            >
                                                {isSlotLocked ? (
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                ) : (
                                                    <svg
                                                        className="w-3.5 h-3.5"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth="2"
                                                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-2 flex flex-col gap-1.5">
                                        {item ? (
                                            <>
                                                <div
                                                    className={`text-xs font-bold ${isSlotLocked ? "text-stone-500" : "text-stone-300"} truncate pb-1`}
                                                >
                                                    {item.name}
                                                </div>
                                                {slotData.drifIds?.map((drifId, idx) => {
                                                    const drif = data.drifs.find(
                                                        (d) =>
                                                            d.id.toString() === drifId?.toString()
                                                    );
                                                    const isDrifLocked =
                                                        lockedDrifs?.[slot.key]?.includes(idx) ||
                                                        isSlotLocked;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`flex justify-between items-center bg-black/40 border p-1 rounded-sm ${isDrifLocked && !isSlotLocked ? "border-red-900/40" : "border-stone-800/60"}`}
                                                        >
                                                            <span
                                                                className={`text-[10px] truncate pr-2 ${drif ? (isDrifLocked ? "text-red-400/80" : "text-amber-600/80") : "text-stone-700 italic"}`}
                                                            >
                                                                {drif
                                                                    ? `${drif.name} (${drif.size})`
                                                                    : "Pusty drif"}
                                                            </span>
                                                            {drif && (
                                                                <button
                                                                    onClick={() =>
                                                                        toggleDrifLock(
                                                                            slot.key,
                                                                            idx
                                                                        )
                                                                    }
                                                                    disabled={isSlotLocked}
                                                                    className={`p-1 transition-colors shrink-0 ${isDrifLocked ? "text-red-500" : "text-stone-600 hover:text-stone-400"} ${isSlotLocked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                                                                >
                                                                    {isDrifLocked ? (
                                                                        <svg
                                                                            className="w-3 h-3"
                                                                            fill="currentColor"
                                                                            viewBox="0 0 20 20"
                                                                        >
                                                                            <path
                                                                                fillRule="evenodd"
                                                                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                                                clipRule="evenodd"
                                                                            />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg
                                                                            className="w-3 h-3"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth="2"
                                                                                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                                                            />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-stone-600 italic py-1">
                                                Brak założonego przedmiotu
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <OptimizerBonusColumn
                    active={activeMobileColumn === "bonuses"}
                    bonuses={filteredAvailableBonuses}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    categoryLabels={drifCategories}
                    onSearchChange={setSearchQuery}
                    onCategoryChange={setSelectedCategory}
                    onSelect={handleSelectBonus}
                />

                <div
                    className={`optimizer-workspace-column optimizer-priority-column ${activeMobileColumn === "priorities" ? "flex" : "hidden"} flex-col gap-2 lg:col-span-4 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
                >
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Priorytety i Limity
                        </h4>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <input
                                ref={configInputRef}
                                type="file"
                                accept="application/json,.json"
                                onChange={handleLoadConfiguration}
                                className="hidden"
                            />
                            <button
                                onClick={() => configInputRef.current?.click()}
                                className="text-[10px] bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-purple-300 border border-stone-700 hover:border-purple-800 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif"
                                title="Wczytaj priorytety i limity z pliku JSON"
                            >
                                Wczytaj
                            </button>
                            <button
                                onClick={handleSaveConfiguration}
                                className="text-[10px] bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-purple-300 border border-stone-700 hover:border-purple-800 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif"
                                title="Zapisz priorytety i limity do pliku JSON"
                            >
                                Zapisz
                            </button>
                            <button
                                onClick={handleSortByPriority}
                                disabled={prioritizedBonuses.length < 2}
                                className="text-[10px] bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-purple-300 border border-stone-700 hover:border-purple-800 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif disabled:opacity-40 disabled:cursor-not-allowed"
                                title={`Sortuj według wagi ${prioritySortDirection === "desc" ? "malejąco" : "rosnąco"}`}
                            >
                                Priorytet {prioritySortDirection === "desc" ? "↓" : "↑"}
                            </button>
                            {prioritizedBonuses.length > 0 && (
                                <button
                                    onClick={() =>
                                        setExpandedPriorities(
                                            expandedPriorities.size > 0
                                                ? new Set()
                                                : new Set(
                                                      prioritizedBonuses.map((bonus) => bonus.key)
                                                  )
                                        )
                                    }
                                    className="text-[10px] bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-700 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif"
                                >
                                    {expandedPriorities.size > 0 ? "Zwiń" : "Rozwiń"}
                                </button>
                            )}
                            {prioritizedBonuses.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-[10px] bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-100 border border-red-900/50 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif"
                                >
                                    Wyczyść
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">
                                Wybierz bonusy z lewej listy, aby ustawić priorytety.
                            </p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => {
                                const maxCap = gameRules?.drifMaxCaps?.[bonus.key];
                                const hasCap = maxCap !== null && maxCap !== undefined;
                                const isExpanded = expandedPriorities.has(bonus.key);
                                const potential = currentModDetails.find(
                                    (detail) => detail.key === bonus.key
                                );

                                return (
                                    <div
                                        key={bonus.key}
                                        className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden"
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none"
                                            style={{ width: `${(bonus.weight / 30) * 100}%` }}
                                        ></div>

                                        <div
                                            className={`flex justify-between items-center bg-black/40 p-2 relative z-10 ${isExpanded ? "border-b border-purple-900/30" : ""}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => togglePriorityExpanded(bonus.key)}
                                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                                aria-expanded={isExpanded}
                                            >
                                                <span className="text-purple-500 font-bold text-xs">
                                                    {index + 1}.
                                                </span>
                                                <span className="text-stone-200 text-xs font-bold font-serif truncate">
                                                    {bonus.value}
                                                </span>
                                                {!isExpanded && (
                                                    <span className="ml-auto text-[9px] text-stone-500 uppercase tracking-wide whitespace-nowrap">
                                                        waga {bonus.weight} · {bonus.min}–
                                                        {bonus.max}
                                                        {bonus.forceCap ? " · cel: cap" : ""}
                                                        {bonus.forcePercentage
                                                            ? ` · ${bonus.forcedPercentage}%`
                                                            : ""}
                                                        {bonus.maximize ? " · max" : ""}
                                                    </span>
                                                )}
                                                <svg
                                                    className={`w-3 h-3 text-stone-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleRemoveBonus(bonus)}
                                                className="ml-2 text-stone-600 hover:text-red-500 transition-colors p-1"
                                                title="Usuń z priorytetów"
                                            >
                                                <svg
                                                    className="w-3.5 h-3.5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="flex flex-col gap-3 p-2 relative z-10">
                                                {potential && (
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border border-sky-950/80 bg-sky-950/20 px-2 py-1.5">
                                                        <div>
                                                            <div className="text-[9px] uppercase tracking-wider text-sky-500">
                                                                Potencjalny zakres
                                                            </div>
                                                        </div>
                                                        <span className="shrink-0 text-xs font-bold text-sky-300 tabular-nums">
                                                            {formatPotentialValue(
                                                                potential.potentialMinimum
                                                            )}
                                                            –
                                                            {formatPotentialValue(
                                                                potential.potentialMaximum
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between items-end">
                                                        <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                                                            Waga Priorytetu
                                                        </span>
                                                        <span className="text-xs text-purple-400 font-bold">
                                                            {bonus.weight}{" "}
                                                            <span className="text-stone-600 text-[9px] font-normal">
                                                                / 30
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="30"
                                                        value={bonus.weight}
                                                        onChange={(e) =>
                                                            handleUpdateBonus(
                                                                bonus.key,
                                                                "weight",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full h-1 bg-stone-950 border border-stone-800 rounded-sm appearance-none cursor-pointer
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-900 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-webkit-slider-thumb]:bg-purple-700 hover:[&::-webkit-slider-thumb]:border-purple-300 transition-all
                                                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-900 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-moz-range-thumb]:bg-purple-700 hover:[&::-moz-range-thumb]:border-purple-300"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2 bg-black/30 p-2 rounded-sm border border-stone-800/50">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                                                            Limit Ilości:
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                                <span className="text-[9px] text-stone-500">
                                                                    MIN
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="12"
                                                                    value={bonus.min}
                                                                    onChange={(e) =>
                                                                        handleUpdateBonus(
                                                                            bonus.key,
                                                                            "min",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-7 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                            <span className="text-stone-700">
                                                                -
                                                            </span>
                                                            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                                <span className="text-[9px] text-stone-500">
                                                                    MAX
                                                                </span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="12"
                                                                    value={bonus.max}
                                                                    onChange={(e) =>
                                                                        handleUpdateBonus(
                                                                            bonus.key,
                                                                            "max",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-7 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                                                        <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                                                            {hasCap
                                                                ? `Dąż do capa (${maxCap > 0 ? "+" : ""}${maxCap}%):`
                                                                : "Dąż do capa:"}
                                                        </span>
                                                        {hasCap ? (
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateBonus(
                                                                        bonus.key,
                                                                        "forceCap",
                                                                        !bonus.forceCap
                                                                    )
                                                                }
                                                                aria-label={`Dąż do capa dla ${bonus.value}`}
                                                                className={`w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${bonus.forceCap ? "bg-purple-900 border-purple-500 text-stone-200 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-stone-950 border-stone-700 text-transparent hover:border-purple-800"}`}
                                                            >
                                                                <svg
                                                                    className="w-3.5 h-3.5"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        ) : (
                                                            <span className="text-[9px] text-stone-600 uppercase tracking-widest italic">
                                                                Brak limitu
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                                                        <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                                                            Wymuś konkretny %:
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`flex items-center gap-1 bg-stone-950 border rounded-sm px-1.5 py-0.5 transition-colors ${bonus.forcePercentage ? "border-purple-600" : "border-stone-700"}`}
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.1"
                                                                    value={bonus.forcedPercentage}
                                                                    disabled={
                                                                        !bonus.forcePercentage
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleUpdateBonus(
                                                                            bonus.key,
                                                                            "forcedPercentage",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    aria-label={`Wymuszony procent dla ${bonus.value}`}
                                                                    className="w-14 bg-transparent text-stone-200 text-xs outline-none text-center font-bold disabled:text-stone-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <span className="text-[10px] text-stone-500">
                                                                    %
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() =>
                                                                    handleUpdateBonus(
                                                                        bonus.key,
                                                                        "forcePercentage",
                                                                        !bonus.forcePercentage
                                                                    )
                                                                }
                                                                aria-label={`Wymuś konkretny procent dla ${bonus.value}`}
                                                                className={`w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${bonus.forcePercentage ? "bg-purple-900 border-purple-500 text-stone-200 shadow-[0_0_8px_rgba(168,85,247,0.5)]" : "bg-stone-950 border-stone-700 text-transparent hover:border-purple-800"}`}
                                                            >
                                                                <svg
                                                                    className="w-3.5 h-3.5"
                                                                    viewBox="0 0 20 20"
                                                                    fill="currentColor"
                                                                >
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                        clipRule="evenodd"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                                                        <span
                                                            className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap"
                                                            title="Algorytm będzie dążył do najwyższej możliwej wartości tego modyfikatora, po spełnieniu limitów ilościowych i celów capa."
                                                        >
                                                            Maksymalizuj mod:
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateBonus(
                                                                    bonus.key,
                                                                    "maximize",
                                                                    !bonus.maximize
                                                                )
                                                            }
                                                            title="Maksymalizuj wartość moda, wykorzystując najpierw przedmioty z najwyższym bonusem do drifów"
                                                            className={`w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${bonus.maximize ? "bg-amber-900 border-amber-500 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-stone-950 border-stone-700 text-transparent hover:border-amber-800"}`}
                                                        >
                                                            <svg
                                                                className="w-3.5 h-3.5"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <aside
                    className={`optimizer-workspace-column optimizer-info-column ${activeMobileColumn === "result" ? "flex" : "hidden"} flex-col gap-4 lg:col-span-4 lg:flex`}
                >
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Raport optymalizacji
                        </h4>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
                            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-2">
                                Status
                            </h5>
                            {isOptimizing ? (
                                <div className="flex items-center gap-2 text-xs text-purple-300">
                                    <svg
                                        className="animate-spin h-4 w-4 shrink-0"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <span>
                                        Optymalizacja trwa ({optimizationElapsedSeconds} s).
                                    </span>
                                </div>
                            ) : optimizationStatus ? (
                                <div
                                    className={`text-xs leading-relaxed ${optimizationStatus.success ? "text-emerald-300" : "text-amber-300"}`}
                                >
                                    <p>{optimizationStatus.message}</p>
                                    {optimizationStatus.warnings?.length > 0 && (
                                        <ul className="mt-2 space-y-1.5 border-l-2 border-amber-700/70 pl-2.5 text-amber-200">
                                            {optimizationStatus.warnings.map((warning, index) => (
                                                <li key={`${warning}-${index}`}>{warning}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {optimizationStatus.applied && !optimizationStatus.success && (
                                        <p className="mt-2 text-stone-400">
                                            Zastosowano najlepszy znaleziony układ.
                                        </p>
                                    )}
                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide">
                                        {optimizationStatus.drifsPlaced !== undefined && (
                                            <>
                                                <dt className="text-stone-500">Umieszczono</dt>
                                                <dd className="text-right text-stone-200 tabular-nums">
                                                    {optimizationStatus.drifsPlaced} drifów
                                                </dd>
                                            </>
                                        )}
                                        {(optimizationStatus.executionTimeSeconds ??
                                            lastOptimizationDurationSeconds) !== null && (
                                            <>
                                                <dt className="text-stone-500">Czas</dt>
                                                <dd className="text-right text-stone-200 tabular-nums">
                                                    {(
                                                        optimizationStatus.executionTimeSeconds ??
                                                        lastOptimizationDurationSeconds
                                                    ).toFixed?.(2) ??
                                                        optimizationStatus.executionTimeSeconds ??
                                                        lastOptimizationDurationSeconds}{" "}
                                                    s
                                                </dd>
                                            </>
                                        )}
                                    </dl>
                                </div>
                            ) : (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    Wynik i ostrzeżenia z kolejnej optymalizacji pojawią się tutaj.
                                </p>
                            )}
                        </section>

                        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
                            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-3">
                                Bonus do drifów na przedmiotach
                            </h5>
                            {Object.keys(optimizationStatus?.itemsByDrifBonus || {}).length ===
                            0 ? (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    Mapa przedmiotów pojawi się po optymalizacji.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(optimizationStatus.itemsByDrifBonus)
                                        .sort(([left], [right]) => Number(right) - Number(left))
                                        .map(([bonus, items]) => (
                                            <div
                                                key={bonus}
                                                className="border-b border-stone-800/70 pb-2 last:border-0 last:pb-0"
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className="text-[10px] text-stone-500 uppercase tracking-wide">
                                                        Bonus do drifów
                                                    </span>
                                                    <span className="text-purple-300 font-bold text-xs tabular-nums">
                                                        +
                                                        {(Number(bonus) * 100).toLocaleString(
                                                            "pl-PL",
                                                            { maximumFractionDigits: 2 }
                                                        )}
                                                        %
                                                    </span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {items.map((item) => {
                                                        const slotLabel =
                                                            SLOTS.find(
                                                                (slot) => slot.key === item.slotKey
                                                            )?.label || item.slotKey;
                                                        return (
                                                            <li
                                                                key={item.slotKey}
                                                                className="flex items-start justify-between gap-2 text-xs"
                                                            >
                                                                <span className="text-stone-300 leading-tight">
                                                                    {item.itemName}
                                                                </span>
                                                                <span className="text-stone-600 text-[10px] uppercase tracking-wide shrink-0">
                                                                    {slotLabel}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </section>

                        <section className="bg-black/40 border border-stone-800 rounded-sm p-3 lg:col-span-2">
                            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-3">
                                Realizacja priorytetów
                            </h5>
                            {!optimizationStatus?.goalResults?.length ? (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    {currentModDetails.length > 0
                                        ? `Uruchom optymalizację, aby kalkulator ocenił ${currentModDetails.length} wybranych priorytetów.`
                                        : "Wyniki priorytetów pojawią się po optymalizacji."}
                                </p>
                            ) : (
                                <div className="grid gap-2 xl:grid-cols-2">
                                    {optimizationStatus.goalResults.map((goal) => {
                                        const current = currentModDetails.find(
                                            (detail) => detail.key === goal.statKey
                                        );
                                        const activeVariant =
                                            optimizationStatus.nextVariants?.[activeVariantIndex];
                                        const activeStatChange = activeVariant?.statChanges?.find(
                                            (change) => change.statKey === goal.statKey
                                        );
                                        const calculatorValue =
                                            activeStatChange?.variantValue ?? goal.calculatorValue;
                                        const displayedCount = current?.count ?? goal.placedCount;
                                        const quantitySatisfied =
                                            displayedCount >= goal.minimumCount &&
                                            displayedCount <= goal.maximumCount;
                                        const targetValue = numericStatValue(goal.targetLabel);
                                        const calculatedValue = numericStatValue(calculatorValue);
                                        const inverseDirection =
                                            Number(gameRules?.drifMaxCaps?.[goal.statKey]) < 0;
                                        const targetSatisfied =
                                            !goal.targetLabel ||
                                            (inverseDirection
                                                ? -calculatedValue >= targetValue
                                                : calculatedValue >= targetValue);
                                        const targetOk = targetSatisfied !== false;
                                        const complete =
                                            calculatorValue != null &&
                                            quantitySatisfied &&
                                            targetOk;
                                        const maximumLabel =
                                            goal.maximumCount >= 2147483647
                                                ? "∞"
                                                : goal.maximumCount;
                                        return (
                                            <div
                                                key={goal.statKey}
                                                className="border border-stone-800/80 bg-black/20 p-2.5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-semibold text-stone-300">
                                                            {goal.bonusName}
                                                        </div>
                                                        <div className="mt-1 text-[9px] uppercase tracking-wider text-stone-600">
                                                            Priorytet {goal.priority}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-wider ${
                                                            complete
                                                                ? "border-emerald-900/80 bg-emerald-950/30 text-emerald-400"
                                                                : "border-amber-900/80 bg-amber-950/30 text-amber-300"
                                                        }`}
                                                    >
                                                        {complete ? "Osiągnięty" : "Częściowo"}
                                                    </span>
                                                </div>
                                                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-stone-800/70 pt-2 text-[10px]">
                                                    <dt className="text-stone-500">
                                                        Liczba drifów
                                                    </dt>
                                                    <dd
                                                        className={
                                                            quantitySatisfied
                                                                ? "text-right text-emerald-400 tabular-nums"
                                                                : "text-right text-amber-300 tabular-nums"
                                                        }
                                                    >
                                                        {displayedCount} / {goal.minimumCount}–
                                                        {maximumLabel}
                                                    </dd>
                                                    <dt className="text-stone-500">
                                                        Kara za liczbę modów
                                                    </dt>
                                                    <dd
                                                        className={
                                                            current?.penaltyPercent > 0
                                                                ? "text-right text-amber-300 tabular-nums"
                                                                : "text-right text-emerald-400 tabular-nums"
                                                        }
                                                    >
                                                        {current?.penaltyPercent > 0
                                                            ? `−${current.penaltyPercent.toFixed(0)}%`
                                                            : "Bez kary"}
                                                    </dd>
                                                    {goal.targetLabel && (
                                                        <>
                                                            <dt className="text-stone-500">
                                                                Cel wartości
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    targetSatisfied
                                                                        ? "text-right text-emerald-400 tabular-nums"
                                                                        : "text-right text-amber-300 tabular-nums"
                                                                }
                                                            >
                                                                {goal.targetLabel}
                                                            </dd>
                                                        </>
                                                    )}
                                                </dl>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="border border-dashed border-stone-700/80 rounded-sm p-3 lg:col-span-2">
                            <h5 className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold mb-2">
                                Kolejne warianty
                            </h5>
                            {optimizationStatus?.nextVariants?.length > 0 ? (
                                <div className="space-y-3">
                                    {optimizationStatus.nextVariants.map(
                                        (variant, variantIndex) => (
                                            <button
                                                type="button"
                                                key={`${variant.bonusName}-${variantIndex}`}
                                                onClick={() => {
                                                    if (applyOptimizationSetup(variant.setup)) {
                                                        setActiveVariantIndex(variantIndex);
                                                    }
                                                }}
                                                className={`block w-full text-left border rounded-sm p-2 transition-colors ${
                                                    activeVariantIndex === variantIndex
                                                        ? "border-purple-500/80 bg-purple-950/30"
                                                        : "border-stone-800/70 bg-black/20 hover:border-stone-600"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 text-xs">
                                                    <span className="text-stone-300 leading-tight font-semibold">
                                                        {variant.main
                                                            ? "Główny wynik"
                                                            : variant.bonusName}
                                                    </span>
                                                    {variant.main ? (
                                                        <span className="text-purple-300 text-[10px] uppercase tracking-wide">
                                                            {activeVariantIndex === variantIndex
                                                                ? "Aktywny"
                                                                : "Ustaw"}
                                                        </span>
                                                    ) : (
                                                        <div className="text-right shrink-0">
                                                            <div className="text-emerald-400 font-bold tabular-nums">
                                                                {Number(
                                                                    variant.finalValue
                                                                ).toLocaleString("pl-PL", {
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                                % →{" "}
                                                                {Number(
                                                                    variant.variantValue
                                                                ).toLocaleString("pl-PL", {
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                                %
                                                            </div>
                                                            <div className="mt-1 text-[9px] text-stone-500 uppercase tracking-wide tabular-nums">
                                                                +
                                                                {Number(
                                                                    variant.gain
                                                                ).toLocaleString("pl-PL", {
                                                                    maximumFractionDigits: 2,
                                                                })}{" "}
                                                                · strata{" "}
                                                                {Number(
                                                                    variant.totalLoss
                                                                ).toLocaleString("pl-PL", {
                                                                    maximumFractionDigits: 2,
                                                                })}{" "}
                                                                · zmian {variant.changeCount} ·
                                                                ocena{" "}
                                                                {Number(
                                                                    variant.score
                                                                ).toLocaleString("pl-PL", {
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {!variant.main && (
                                                    <ul className="mt-2 space-y-1">
                                                        {variant.changes.map(
                                                            (change, changeIndex) => {
                                                                const slotLabel =
                                                                    SLOTS.find(
                                                                        (slot) =>
                                                                            slot.key ===
                                                                            change.slotKey
                                                                    )?.label || change.slotKey;
                                                                const formatPlacement = (
                                                                    modifier,
                                                                    level
                                                                ) =>
                                                                    modifier
                                                                        ? `${modifier}${level ? ` (${level})` : ""}`
                                                                        : "puste miejsce";
                                                                return (
                                                                    <li
                                                                        key={`${change.slotKey}-${changeIndex}`}
                                                                        className="text-[11px] text-stone-500 leading-snug"
                                                                    >
                                                                        <span className="text-stone-400">
                                                                            {change.itemName}
                                                                        </span>{" "}
                                                                        ({slotLabel}):{" "}
                                                                        {formatPlacement(
                                                                            change.fromModifier,
                                                                            change.fromLevel
                                                                        )}{" "}
                                                                        →{" "}
                                                                        <span className="text-purple-300">
                                                                            {formatPlacement(
                                                                                change.toModifier,
                                                                                change.toLevel
                                                                            )}
                                                                        </span>
                                                                    </li>
                                                                );
                                                            }
                                                        )}
                                                    </ul>
                                                )}
                                                {!variant.main &&
                                                    variant.statChanges?.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-stone-800/80 space-y-1">
                                                            <div className="text-[9px] text-stone-600 uppercase tracking-wider">
                                                                Zmiany statystyk
                                                            </div>
                                                            {variant.statChanges.map((change) => {
                                                                const before = numericStatValue(
                                                                    change.finalValue
                                                                );
                                                                const after = numericStatValue(
                                                                    change.variantValue
                                                                );
                                                                const inverseDirection =
                                                                    Number(
                                                                        gameRules?.drifMaxCaps?.[
                                                                            change.statKey
                                                                        ]
                                                                    ) < 0;
                                                                const improves = inverseDirection
                                                                    ? after < before
                                                                    : after > before;
                                                                return (
                                                                    <div
                                                                        key={change.statKey}
                                                                        className="flex items-start justify-between gap-2 text-[11px] leading-snug"
                                                                    >
                                                                        <span className="text-stone-400">
                                                                            {gameRules
                                                                                ?.bonusTranslations?.[
                                                                                change.statKey
                                                                            ] || change.statKey}
                                                                        </span>
                                                                        <span className="shrink-0 tabular-nums">
                                                                            <span className="text-stone-500">
                                                                                {change.finalValue}
                                                                            </span>
                                                                            <span className="text-stone-600">
                                                                                {" "}
                                                                                →{" "}
                                                                            </span>
                                                                            <span
                                                                                className={
                                                                                    improves
                                                                                        ? "text-emerald-400"
                                                                                        : "text-red-400"
                                                                                }
                                                                            >
                                                                                {
                                                                                    change.variantValue
                                                                                }
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                            </button>
                                        )
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    Brak ocenionych wariantów poprawiających maksymalizowany mod.
                                </p>
                            )}
                        </section>
                    </div>
                </aside>
            </div>

            <OptimizerRunAction
                priorityCount={prioritizedBonuses.length}
                isOptimizing={isOptimizing}
                elapsedSeconds={optimizationElapsedSeconds}
                lastDurationSeconds={lastOptimizationDurationSeconds}
                hasResult={Boolean(optimizationStatus)}
                onRun={handleOptimizeClick}
            />
        </div>
    );
};

export default OptimizerPanel;
