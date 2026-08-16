import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useEquipment } from '../context/EquipmentContext';
import { SLOTS } from '../constants/equipment';

const OPTIMIZER_CONFIG_FORMAT = 'broken-ranks-tool-optimizer-config';
const OPTIMIZER_CONFIG_VERSION = 1;
const DRIF_CATEGORY_ORDER = ['OFFENSIVE', 'DEFENSIVE', 'UTILITY'];
const DRIF_CATEGORY_LABELS = {
    OFFENSIVE: 'Ofensywne',
    DEFENSIVE: 'Defensywne',
    UTILITY: 'UĹĽytkowe'
};
const DRIF_BONUS_CATEGORY_FALLBACK = {
    CC_PROTECTION: 'DEFENSIVE',
    CRITICAL_DAMAGE_CHANCE_REDUCTION: 'DEFENSIVE',
    CRITICAL_DAMAGE_REDUCTION: 'DEFENSIVE',
    DAMAGE_REDUCTION: 'DEFENSIVE',
    DAMAGE_REDUCTION_CHANCE: 'DEFENSIVE',
    DEFENSE_MELEE: 'DEFENSIVE',
    DEFENSE_MENTAL: 'DEFENSIVE',
    DEFENSE_RANGE: 'DEFENSIVE',
    DODGE_CHANCE: 'DEFENSIVE',
    DOUBLE_DEFENSE_ROLL_CHANCE: 'DEFENSIVE',
    PASIVE_DAMAGE_REDUCTION: 'DEFENSIVE',
    PERCENTAGE_DAMAGE_REDUCTION: 'DEFENSIVE',
    CRITICAL_CHANCE: 'OFFENSIVE',
    DAMAGE_ENERGY: 'OFFENSIVE',
    DAMAGE_FIRE: 'OFFENSIVE',
    DAMAGE_FROST: 'OFFENSIVE',
    DAMAGE_MAGIC: 'OFFENSIVE',
    DAMAGE_PHYSICAL: 'OFFENSIVE',
    DOUBLE_ATTACK_CHANCE: 'OFFENSIVE',
    DOUBLE_HIT_ROLL_CHANCE: 'OFFENSIVE',
    HIT_CHANCE_MELEE: 'OFFENSIVE',
    HIT_CHANCE_MENTAL: 'OFFENSIVE',
    HIT_CHANCE_RANGED: 'OFFENSIVE',
    MENTAL_DEFENSE_REDUCTION: 'OFFENSIVE',
    DISPELL_CHANCE: 'UTILITY',
    MANA_REGEN: 'UTILITY',
    MANA_STEAL: 'UTILITY',
    MANA_USAGE_REDUCTION: 'UTILITY',
    STAMINA_REGEN: 'UTILITY',
    STAMINA_USAGE_REDUCTION: 'UTILITY'
};

/**
 * Matches the backend duplicate-drif penalty and keeps the panel correct
 * while an older backend response without penalty multipliers is cached.
 */
const getDrifPenaltyMultiplier = (count, multipliers = {}) => {
    const providedMultiplier = Number(multipliers?.[count]);
    if (Number.isFinite(providedMultiplier)) return providedMultiplier;
    if (count <= 3) return 1;

    const fallbackMultipliers = {
        4: 0.95, 5: 0.87, 6: 0.80, 7: 0.74, 8: 0.69,
        9: 0.64, 10: 0.59, 11: 0.54
    };
    return fallbackMultipliers[count] ?? 0.50;
};

const createBonusOption = ([key, value], drifBonusCategories = {}) => ({
    key,
    value,
    categoryKey: drifBonusCategories[key] || DRIF_BONUS_CATEGORY_FALLBACK[key] || ''
});

const sortBonusesByCategory = (bonuses) => [...bonuses].sort((left, right) => {
    const leftCategoryIndex = DRIF_CATEGORY_ORDER.indexOf(left.categoryKey);
    const rightCategoryIndex = DRIF_CATEGORY_ORDER.indexOf(right.categoryKey);
    const categoryDifference = (leftCategoryIndex === -1 ? Number.MAX_SAFE_INTEGER : leftCategoryIndex)
        - (rightCategoryIndex === -1 ? Number.MAX_SAFE_INTEGER : rightCategoryIndex);

    return categoryDifference || left.value.localeCompare(right.value, 'pl');
});

/**
 * Provides drif priorities, target limits, and equipment locking for optimization.
 * @returns {JSX.Element} The optimizer panel.
 */
const OptimizerPanel = () => {
    const {
        gameRules, drifCategories, runDrifOptimization, requestData, data,
        lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock
    } = useEquipment();

    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationElapsedSeconds, setOptimizationElapsedSeconds] = useState(0);
    const [lastOptimizationDurationSeconds, setLastOptimizationDurationSeconds] = useState(null);
    const [optimizationStatus, setOptimizationStatus] = useState(null);
    const [prioritySortDirection, setPrioritySortDirection] = useState('desc');
    const configInputRef = useRef(null);
    const optimizationStartTimeRef = useRef(null);

    useEffect(() => {
        if (!isOptimizing) return undefined;

        const timerId = window.setInterval(() => {
            if (optimizationStartTimeRef.current === null) return;
            setOptimizationElapsedSeconds(Math.floor(
                (performance.now() - optimizationStartTimeRef.current) / 1000
            ));
        }, 250);

        return () => window.clearInterval(timerId);
    }, [isOptimizing]);

    useEffect(() => {
        if (gameRules?.bonusTranslations) {
            const allBonuses = Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) => createBonusOption([key, value], gameRules.drifBonusCategories))
                .filter(b => gameRules.drifBasePowers[b.key] !== undefined);
            setAvailableBonuses(sortBonusesByCategory(allBonuses));
        }
    }, [gameRules, drifCategories]);

    const filteredAvailableBonuses = availableBonuses.filter(b => {
        const matchesCategory = selectedCategory === 'ALL' || b.categoryKey === selectedCategory;
        const matchesSearch = b.value.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const currentModDetails = useMemo(() => {
        const counts = {};
        const drifsById = new Map(data.drifs.map(drif => [String(drif.id), drif]));

        Object.values(requestData.slots || {}).forEach(slot => {
            const typesInSlot = new Set();
            (slot?.drifIds || []).forEach(drifId => {
                const drif = drifsById.get(String(drifId));
                if (drif?.bonusType && !typesInSlot.has(drif.bonusType)) {
                    typesInSlot.add(drif.bonusType);
                    counts[drif.bonusType] = (counts[drif.bonusType] || 0) + 1;
                }
            });
        });

        return prioritizedBonuses.map(bonus => {
            const count = counts[bonus.key] || 0;
            const multiplier = getDrifPenaltyMultiplier(count, gameRules?.drifPenaltyMultipliers);
            return {
                ...bonus,
                count,
                penaltyPercent: Math.max(0, (1 - multiplier) * 100)
            };
        });
    }, [data.drifs, gameRules?.drifPenaltyMultipliers, prioritizedBonuses, requestData.slots]);

    /** Moves a selected bonus into the priority list. */
    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses(prev => [...prev, { ...bonus, weight: 15, min: 0, max: 12, forceCap: false, maximize: false }]);
        setAvailableBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /** Removes a bonus from the priority list and restores it to available choices. */
    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses(prev => sortBonusesByCategory([...prev, createBonusOption([bonus.key, bonus.value], gameRules?.drifBonusCategories)]));
        setPrioritizedBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /** Clears all configured priorities. */
    const handleClearAll = () => {
        setAvailableBonuses(prev => {
            const combined = [
                ...prev,
                ...prioritizedBonuses.map(b => createBonusOption([b.key, b.value], gameRules?.drifBonusCategories))
            ];
            return sortBonusesByCategory(combined);
        });
        setPrioritizedBonuses([]);
    };

    /** Updates one field of a configured priority. */
    const handleUpdateBonus = (key, field, value) => {
        setPrioritizedBonuses(prev => prev.map(b => {
            if (b.key === key) {
                return { ...b, [field]: value };
            }
            return b;
        }));
    };

    /** Sorts priorities by weight while preserving tie order. */
    const handleSortByPriority = () => {
        setPrioritizedBonuses(prev => {
            const direction = prioritySortDirection === 'desc' ? 1 : -1;
            return prev
                .map((bonus, index) => ({ bonus, index }))
                .sort((left, right) => {
                    const weightDifference = (Number(right.bonus.weight) - Number(left.bonus.weight)) * direction;
                    return weightDifference || left.index - right.index;
                })
                .map(({ bonus }) => bonus);
        });
        setPrioritySortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const handleSaveConfiguration = () => {
        const payload = {
            format: OPTIMIZER_CONFIG_FORMAT,
            version: OPTIMIZER_CONFIG_VERSION,
            exportedAt: new Date().toISOString(),
            priorities: prioritizedBonuses.map(({ key, weight, min, max, forceCap, maximize }) => ({
                key,
                weight: Number(weight),
                min: Number(min),
                max: Number(max),
                forceCap: Boolean(forceCap),
                maximize: Boolean(maximize)
            }))
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `broken-ranks-priorytety-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleLoadConfiguration = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert('Plik konfiguracji jest zbyt duży.');
            return;
        }

        try {
            const payload = JSON.parse(await file.text());
            if (payload?.format !== OPTIMIZER_CONFIG_FORMAT || payload?.version !== OPTIMIZER_CONFIG_VERSION
                    || !Array.isArray(payload.priorities)) {
                throw new Error('Nieobsługiwany format lub wersja pliku konfiguracji.');
            }

            const knownBonuses = new Map(Object.entries(gameRules?.bonusTranslations || {})
                .filter(([key]) => gameRules?.drifBasePowers?.[key] !== undefined)
                .map(entry => {
                    const bonus = createBonusOption(entry, gameRules?.drifBonusCategories);
                    return [bonus.key, bonus];
                }));
            const usedKeys = new Set();
            const imported = payload.priorities.flatMap(entry => {
                if (!entry || typeof entry.key !== 'string' || usedKeys.has(entry.key)) return [];
                const bonus = knownBonuses.get(entry.key);
                if (!bonus) return [];
                usedKeys.add(entry.key);

                const parsedWeight = Number(entry.weight);
                const parsedMin = Number(entry.min);
                const parsedMax = Number(entry.max);
                const min = Math.max(0, Math.min(12, Number.isFinite(parsedMin) ? Math.trunc(parsedMin) : 0));
                const max = Math.max(min, Math.min(12, Number.isFinite(parsedMax) ? Math.trunc(parsedMax) : 12));
                return [{
                    key: entry.key,
                    value: bonus.value,
                    categoryKey: bonus.categoryKey,
                    weight: Math.max(1, Math.min(30, Number.isFinite(parsedWeight) ? Math.trunc(parsedWeight) : 15)),
                    min,
                    max,
                    forceCap: Boolean(entry.forceCap),
                    maximize: Boolean(entry.maximize ?? entry.critical)
                }];
            });

            if (imported.length === 0 && payload.priorities.length > 0) {
                throw new Error('Plik nie zawiera bonusów dostępnych w aktualnej wersji danych gry.');
            }

            setPrioritizedBonuses(imported);
            setAvailableBonuses(sortBonusesByCategory([...knownBonuses.entries()]
                .filter(([key]) => !usedKeys.has(key))
                .map(([, bonus]) => bonus)));
            alert(`Wczytano konfigurację: ${imported.length} priorytetów.`);
        } catch (error) {
            alert(`Nie udało się wczytać konfiguracji: ${error.message || 'niepoprawny plik JSON.'}`);
        }
    };

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;
        setIsOptimizing(true);
        setOptimizationElapsedSeconds(0);
        const startedAt = performance.now();
        optimizationStartTimeRef.current = startedAt;

        const priorities = {};
        const targetQuantities = {};
        const forceCapBonuses = [];
        const maximizeBonuses = [];

        prioritizedBonuses.forEach(b => {
            priorities[b.key] = parseInt(b.weight, 10);

            const parsedMin = parseInt(b.min, 10);
            const parsedMax = parseInt(b.max, 10);
            const min = Math.min(12, Math.max(0, Number.isNaN(parsedMin) ? 0 : parsedMin));
            const max = Math.min(12, Math.max(min, Number.isNaN(parsedMax) ? 12 : parsedMax));

            // Wysyłamy zakres dla każdego priorytetu, również 0–12.
            // Dzięki temu backend dostaje dokładnie stan widoczny w UI,
            // a puste lub chwilowo tekstowe wartości nie tworzą zakresu 0–0.
            targetQuantities[b.key] = { min, max };

            if (b.forceCap) {
                forceCapBonuses.push(b.key);
            }

            if (b.maximize) {
                maximizeBonuses.push(b.key);
            }
        });

        try {
            const result = await runDrifOptimization({
                priorities, targetQuantities, forceCapBonuses, maximizeBonuses
            });
            setOptimizationStatus(result);
        } finally {
            const durationSeconds = Math.floor((performance.now() - startedAt) / 1000);
            setOptimizationElapsedSeconds(durationSeconds);
            setLastOptimizationDurationSeconds(durationSeconds);
            optimizationStartTimeRef.current = null;
            setIsOptimizing(false);
        }
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-5 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 xl:gap-8 flex-1 min-h-[700px]">

                <div className="flex flex-col gap-2 h-full min-h-0 border-r border-stone-800/60 pr-4 xl:pr-6">
                    <div className="flex items-center justify-center border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Zablokowane Sloty
                        </h4>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {SLOTS.map(slot => {
                            const slotData = requestData.slots?.[slot.key];
                            const item = slotData?.itemId ? data.items.find(i => i.id.toString() === slotData.itemId.toString()) : null;
                            const isSlotLocked = lockedSlots?.includes(slot.key);

                            return (
                                <div key={slot.key} className={`flex flex-col bg-stone-950/60 border mb-3 rounded-sm transition-all ${isSlotLocked ? 'border-red-900/50 shadow-[inset_0_0_15px_rgba(127,29,29,0.2)]' : 'border-stone-800/80 hover:border-stone-600'}`}>
                                    <div className="flex justify-between items-center bg-black/60 p-2 border-b border-stone-800/60">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSlotLocked ? 'text-red-500' : 'text-stone-400'}`}>
                                            {slot.label}
                                        </span>
                                        {item && (
                                            <button
                                                onClick={() => toggleSlotLock(slot.key)}
                                                className={`p-1 rounded-sm transition-colors ${isSlotLocked ? 'text-red-500 hover:text-red-400 bg-red-950/40' : 'text-stone-600 hover:text-stone-300 bg-stone-900'}`}
                                                title={isSlotLocked ? "Odblokuj slot" : "Zablokuj cały slot"}
                                            >
                                                {isSlotLocked ? (
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    <div className="p-2 flex flex-col gap-1.5">
                                        {item ? (
                                            <>
                                                <div className={`text-xs font-bold ${isSlotLocked ? 'text-stone-500' : 'text-stone-300'} truncate pb-1`}>
                                                    {item.name}
                                                </div>
                                                {slotData.drifIds?.map((drifId, idx) => {
                                                    const drif = data.drifs.find(d => d.id.toString() === drifId?.toString());
                                                    const isDrifLocked = lockedDrifs?.[slot.key]?.includes(idx) || isSlotLocked;

                                                    return (
                                                        <div key={idx} className={`flex justify-between items-center bg-black/40 border p-1 rounded-sm ${isDrifLocked && !isSlotLocked ? 'border-red-900/40' : 'border-stone-800/60'}`}>
                                                            <span className={`text-[10px] truncate pr-2 ${drif ? (isDrifLocked ? 'text-red-400/80' : 'text-amber-600/80') : 'text-stone-700 italic'}`}>
                                                                {drif ? `${drif.name} (${drif.size})` : 'Pusty drif'}
                                                            </span>
                                                            {drif && (
                                                                <button
                                                                    onClick={() => toggleDrifLock(slot.key, idx)}
                                                                    disabled={isSlotLocked}
                                                                    className={`p-1 transition-colors shrink-0 ${isDrifLocked ? 'text-red-500' : 'text-stone-600 hover:text-stone-400'} ${isSlotLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                                                >
                                                                    {isDrifLocked ? (
                                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                                        </svg>
                                                                    ) : (
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-stone-600 italic py-1">Brak założonego przedmiotu</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-2 h-full min-h-0 border-r border-stone-800/60 pr-4 xl:pr-6">
                    <div className="flex items-center justify-center border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Dostępne Bonusy
                        </h4>
                    </div>

                    <div className="mb-2 shrink-0">
                        <input
                            type="text"
                            placeholder="Szukaj statystyki..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-950/80 border border-stone-700 focus:border-purple-600 rounded-sm p-2 text-xs text-stone-200 font-serif outline-none transition-colors shadow-inner placeholder-stone-600"
                        />
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2 shrink-0" role="group" aria-label="Filtruj bonusy według kategorii">
                        {['ALL', ...DRIF_CATEGORY_ORDER].map(categoryKey => {
                            const isSelected = selectedCategory === categoryKey;
                            const label = categoryKey === 'ALL'
                                ? 'Wszystkie'
                                : (drifCategories?.[categoryKey] || DRIF_CATEGORY_LABELS[categoryKey]);

                            return (
                                <button
                                    key={categoryKey}
                                    type="button"
                                    onClick={() => setSelectedCategory(categoryKey)}
                                    className={`flex-1 min-w-[70px] px-2 py-1.5 border rounded-sm text-[10px] uppercase tracking-wider font-serif transition-colors ${isSelected
                                        ? 'bg-purple-900/60 border-purple-500 text-purple-100'
                                        : 'bg-stone-950/80 border-stone-700 text-stone-500 hover:border-purple-800 hover:text-stone-200'
                                    }`}
                                    aria-pressed={isSelected}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {filteredAvailableBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-4 text-xs font-serif">Brak wyników...</p>
                        ) : (
                            filteredAvailableBonuses.map(bonus => (
                                <div key={bonus.key} onClick={() => handleSelectBonus(bonus)}
                                     className="flex justify-between items-center bg-black/40 p-2 border-b border-stone-800 hover:bg-stone-800/80 hover:border-purple-900/50 cursor-pointer transition-all group mb-[1px]">
                                    <span className="text-stone-400 group-hover:text-stone-200 text-xs font-serif transition-colors">{bonus.value}</span>
                                    <span className="text-stone-600 group-hover:text-purple-400 font-bold text-lg leading-none transition-colors shrink-0">+</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Priorytety i Limity
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
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
                                title={`Sortuj według wagi ${prioritySortDirection === 'desc' ? 'malejąco' : 'rosnąco'}`}
                            >
                                Priorytet {prioritySortDirection === 'desc' ? '↓' : '↑'}
                            </button>
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
                            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">Wybierz bonusy z lewej listy, aby ustawić priorytety.</p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => {
                                const maxCap = gameRules?.drifMaxCaps?.[bonus.key];
                                const hasCap = maxCap !== null && maxCap !== undefined;

                                return (
                                    <div key={bonus.key} className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none" style={{ width: `${(bonus.weight / 30) * 100}%` }}></div>

                                        <div className="flex justify-between items-center bg-black/40 p-2 border-b border-purple-900/30 relative z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-500 font-bold text-xs">{index + 1}.</span>
                                                <span className="text-stone-200 text-xs font-bold font-serif">{bonus.value}</span>
                                            </div>
                                            <button onClick={() => handleRemoveBonus(bonus)} className="text-stone-600 hover:text-red-500 transition-colors p-1" title="Usuń z priorytetów">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-3 p-2 relative z-10">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Waga Priorytetu</span>
                                                    <span className="text-xs text-purple-400 font-bold">{bonus.weight} <span className="text-stone-600 text-[9px] font-normal">/ 30</span></span>
                                                </div>
                                                <input
                                                    type="range" min="1" max="30" value={bonus.weight}
                                                    onChange={(e) => handleUpdateBonus(bonus.key, 'weight', e.target.value)}
                                                    className="w-full h-1 bg-stone-950 border border-stone-800 rounded-sm appearance-none cursor-pointer
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-900 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-webkit-slider-thumb]:bg-purple-700 hover:[&::-webkit-slider-thumb]:border-purple-300 transition-all
                                                    [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-900 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-moz-range-thumb]:bg-purple-700 hover:[&::-moz-range-thumb]:border-purple-300"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2 bg-black/30 p-2 rounded-sm border border-stone-800/50">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">Limit Ilości:</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                            <span className="text-[9px] text-stone-500">MIN</span>
                                                            <input
                                                                type="number" min="0" max="12" value={bonus.min}
                                                                onChange={(e) => handleUpdateBonus(bonus.key, 'min', e.target.value)}
                                                                className="w-7 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                        <span className="text-stone-700">-</span>
                                                        <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                            <span className="text-[9px] text-stone-500">MAX</span>
                                                            <input
                                                                type="number" min="0" max="12" value={bonus.max}
                                                                onChange={(e) => handleUpdateBonus(bonus.key, 'max', e.target.value)}
                                                                className="w-7 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                                                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                                                        {hasCap ? `Wymuś Max Cap (${maxCap > 0 ? '+' : ''}${maxCap}%):` : 'Wymuś Max Cap:'}
                                                    </span>
                                                    {hasCap ? (
                                                        <button
                                                            onClick={() => handleUpdateBonus(bonus.key, 'forceCap', !bonus.forceCap)}
                                                            className={`w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${bonus.forceCap ? 'bg-purple-900 border-purple-500 text-stone-200 shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'bg-stone-950 border-stone-700 text-transparent hover:border-purple-800'}`}
                                                        >
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[9px] text-stone-600 uppercase tracking-widest italic">Brak limitu</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                                                    <span
                                                        className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap"
                                                        title="Algorytm będzie dążył do najwyższej możliwej wartości tego modyfikatora, po spełnieniu limitów ilościowych i wymuszonych capów."
                                                    >
                                                        Maksymalizuj mod:
                                                    </span>
                                                    <button
                                                        onClick={() => handleUpdateBonus(bonus.key, 'maximize', !bonus.maximize)}
                                                        title="Maksymalizuj wartość moda, wykorzystując najpierw przedmioty z najwyższym bonusem do drifów"
                                                        className={`w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${bonus.maximize ? 'bg-amber-900 border-amber-500 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-stone-950 border-stone-700 text-transparent hover:border-amber-800'}`}
                                                    >
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <aside className="flex flex-col gap-4 h-full min-h-0 border-l border-stone-800/60 pl-4 xl:pl-6">
                    <div className="flex items-center justify-center border-b border-stone-700 pb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Informacje z optymalizacji
                        </h4>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
                            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-2">
                                Status
                            </h5>
                            {isOptimizing ? (
                                <div className="flex items-center gap-2 text-xs text-purple-300">
                                    <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Optymalizacja trwa ({optimizationElapsedSeconds} s).</span>
                                </div>
                            ) : optimizationStatus ? (
                                <div className={`text-xs leading-relaxed ${optimizationStatus.success ? 'text-emerald-300' : 'text-amber-300'}`}>
                                    <p>{optimizationStatus.message}</p>
                                    {optimizationStatus.warnings?.length > 0 && (
                                        <ul className="mt-2 space-y-1.5 border-l-2 border-amber-700/70 pl-2.5 text-amber-200">
                                            {optimizationStatus.warnings.map((warning, index) => (
                                                <li key={`${warning}-${index}`}>{warning}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {optimizationStatus.applied && !optimizationStatus.success && (
                                        <p className="mt-2 text-stone-400">Zastosowano najlepszy znaleziony układ.</p>
                                    )}
                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide">
                                        {optimizationStatus.drifsPlaced !== undefined && (
                                            <>
                                                <dt className="text-stone-500">Umieszczono</dt>
                                                <dd className="text-right text-stone-200 tabular-nums">{optimizationStatus.drifsPlaced} drifów</dd>
                                            </>
                                        )}
                                        {(optimizationStatus.executionTimeSeconds ?? lastOptimizationDurationSeconds) !== null && (
                                            <>
                                                <dt className="text-stone-500">Czas</dt>
                                                <dd className="text-right text-stone-200 tabular-nums">
                                                    {(optimizationStatus.executionTimeSeconds ?? lastOptimizationDurationSeconds).toFixed?.(2)
                                                        ?? optimizationStatus.executionTimeSeconds ?? lastOptimizationDurationSeconds} s
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
                            {Object.keys(optimizationStatus?.itemsByDrifBonus || {}).length === 0 ? (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    Mapa przedmiotów pojawi się po optymalizacji.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(optimizationStatus.itemsByDrifBonus)
                                        .sort(([left], [right]) => Number(right) - Number(left))
                                        .map(([bonus, items]) => (
                                            <div key={bonus} className="border-b border-stone-800/70 pb-2 last:border-0 last:pb-0">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className="text-[10px] text-stone-500 uppercase tracking-wide">
                                                        Bonus do drifów
                                                    </span>
                                                    <span className="text-purple-300 font-bold text-xs tabular-nums">
                                                        +{(Number(bonus) * 100).toLocaleString('pl-PL', { maximumFractionDigits: 2 })}%
                                                    </span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {items.map(item => {
                                                        const slotLabel = SLOTS.find(slot => slot.key === item.slotKey)?.label || item.slotKey;
                                                        return (
                                                            <li key={item.slotKey} className="flex items-start justify-between gap-2 text-xs">
                                                                <span className="text-stone-300 leading-tight">{item.itemName}</span>
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

                        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
                            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-3">
                                Aktualne mody i kara
                            </h5>
                            {currentModDetails.length === 0 ? (
                                <p className="text-xs text-stone-600 italic leading-relaxed">
                                    Dodaj mod do priorytetów, aby zobaczyć jego aktualną liczbę i karę.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {currentModDetails.map(bonus => (
                                        <div key={bonus.key} className="border-b border-stone-800/70 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-start justify-between gap-2 text-xs">
                                                <span className="text-stone-300 leading-tight">{bonus.value}</span>
                                                <span className="text-purple-300 font-bold tabular-nums shrink-0">×{bonus.count}</span>
                                            </div>
                                            <div className="flex justify-between mt-1 text-[10px] uppercase tracking-wide">
                                                <span className="text-stone-600">Limit {bonus.min}–{bonus.max}</span>
                                                <span className={bonus.penaltyPercent > 0 ? 'text-amber-400' : 'text-emerald-500'}>
                                                    {bonus.penaltyPercent > 0
                                                        ? `Kara −${bonus.penaltyPercent.toFixed(0)}%`
                                                        : 'Bez kary'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="border border-dashed border-stone-700/80 rounded-sm p-3">
                            <h5 className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold mb-2">
                                Kolejne warianty
                            </h5>
                            <p className="text-xs text-stone-600 italic leading-relaxed">
                                Tu pojawią się podpowiedzi zamian i alternatywne konfiguracje.
                            </p>
                        </section>
                    </div>
                </aside>
            </div>

            <div className="flex justify-center mt-6 pt-4 border-t border-stone-800/80 shrink-0 relative z-10 w-full max-w-xl mx-auto">
                <button
                    onClick={handleOptimizeClick}
                    disabled={prioritizedBonuses.length === 0 || isOptimizing}
                    className="w-full py-4 bg-gradient-to-b from-purple-900 to-black border border-purple-800 hover:from-purple-800 hover:to-black hover:border-purple-500 text-stone-200 font-serif font-bold text-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(128,0,128,0.3)] hover:shadow-[0_0_25px_rgba(160,32,240,0.5)] disabled:opacity-40 disabled:hover:from-purple-900 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-sm"
                >
                    {isOptimizing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            KALKULACJA W TLE...
                            <span className="text-purple-300 tabular-nums">({optimizationElapsedSeconds} s)</span>
                        </>
                    ) : (
                        "URUCHOM OPTYMALIZACJĘ"
                    )}
                </button>
            </div>
        </div>
    );
};

export default OptimizerPanel;
