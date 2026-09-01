import React from "react";
import { DRIF_MULTIPLIERS, SIZE_INDEX } from "../../utils/GearRules";
import { formatGroupLabel, getDrifMaxLvl } from "../../utils/formatters";
import CategoryIcon from "../CategoryIcon";

const LockIcon = ({ locked }) =>
    locked ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
            />
        </svg>
    ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
        </svg>
    );

/** Renders and edits one standard drif position. */
const StandardDrifSlot = ({
    index,
    drifs,
    selectedDrifs,
    drifTypes,
    drifLevels,
    maxDrifIndex,
    bonusTranslations,
    drifBasePowers,
    groupByType,
    locked,
    parentLocked,
    showLock,
    overCapacity,
    dragActive,
    onDragOver,
    onDragLeave,
    onDrop,
    onToggleLock,
    setSelectedDrifs,
    setDrifTypes,
    setDrifLevels,
}) => {
    const drifId = selectedDrifs[index] || "";
    const currentType = drifTypes[index] || "";
    const usedTypes = selectedDrifs
        .map((id, position) =>
            position !== index && id
                ? drifs.find((drif) => String(drif.id) === String(id))?.bonusType
                : null
        )
        .filter(Boolean);
    const allowed = drifs.filter((drif) => {
        if (drifId && String(drif.id) === String(drifId)) return true;
        const sizeIndex = drif.size ? (SIZE_INDEX[drif.size.toUpperCase()] ?? -1) : -1;
        return !usedTypes.includes(drif.bonusType) && sizeIndex >= 0 && sizeIndex <= maxDrifIndex;
    });
    const grouped = groupByType(allowed);
    const current = drifs.find((drif) => String(drif.id) === String(drifId));
    const currentCategory = current?.category || grouped[currentType]?.[0]?.category;
    const maximumLevel = current ? getDrifMaxLvl(current.size) : 21;
    const borderClass = locked
        ? "border-red-900/60 bg-red-950/10"
        : dragActive
          ? "border-amber-800/50 bg-amber-950/20"
          : "border-rose-900/70";
    const selectClass = `${locked ? "cursor-not-allowed border-red-900/50" : "border-rose-900/70 focus:border-rose-500 cursor-pointer"} ${overCapacity && !locked ? "border-red-500/80" : ""}`;

    return (
        <div
            className={`flex gap-1 w-full items-center p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${borderClass}`}
            onDragOver={locked ? undefined : onDragOver}
            onDragLeave={locked ? undefined : onDragLeave}
            onDrop={locked ? undefined : onDrop}
        >
            <CategoryIcon
                kind="drif"
                category={currentCategory}
                className="drif-selector-category-icon"
            />
            <select
                value={currentType}
                aria-label={`Wybierz rodzaj drifa ${index + 1}`}
                disabled={locked}
                onChange={(event) => {
                    setDrifTypes((previous) => ({ ...previous, [index]: event.target.value }));
                    setSelectedDrifs((previous) => {
                        const next = [...previous];
                        next[index] = "";
                        return next;
                    });
                    setDrifLevels((previous) => ({ ...previous, [index]: "" }));
                }}
                className={`flex-[3] min-w-0 bg-transparent text-amber-600 font-serif p-1 text-xs border-b outline-none text-center ${selectClass}`}
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    Rodzaj
                </option>
                {Object.keys(grouped).map((type) => (
                    <option key={type} value={type} className="bg-stone-950 text-stone-300">
                        {formatGroupLabel(type, grouped[type], bonusTranslations)}
                    </option>
                ))}
            </select>
            <select
                value={drifId}
                aria-label={`Wybierz wielkość drifa ${index + 1}`}
                disabled={!currentType || locked}
                onChange={(event) => {
                    setSelectedDrifs((previous) => {
                        const next = [...previous];
                        next[index] = event.target.value;
                        return next;
                    });
                    setDrifLevels((previous) => ({ ...previous, [index]: 1 }));
                }}
                className={`flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b outline-none text-center disabled:opacity-30 ${selectClass}`}
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    Wielkość
                </option>
                {currentType &&
                    grouped[currentType]?.map((drif) => {
                        const multiplier = drif.size
                            ? DRIF_MULTIPLIERS[drif.size.toUpperCase()] || 1
                            : 1;
                        const minimum = drifBasePowers[drif.bonusType] || 0;
                        const maximum = minimum * multiplier;
                        const power =
                            minimum === maximum ? `${minimum}p` : `${minimum}-${maximum}p`;
                        return (
                            <option
                                key={drif.id}
                                value={drif.id}
                                className="bg-stone-950 text-stone-300"
                            >
                                {drif.size || drif.tier} ({power})
                            </option>
                        );
                    })}
            </select>
            <select
                value={drifLevels[index] || ""}
                aria-label={`Wybierz poziom drifa ${index + 1}`}
                disabled={!drifId || locked}
                onChange={(event) =>
                    setDrifLevels((previous) => ({
                        ...previous,
                        [index]: Number.parseInt(event.target.value),
                    }))
                }
                className={`flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b outline-none text-center disabled:opacity-30 ${selectClass}`}
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    lvl
                </option>
                {Array.from({ length: maximumLevel }, (_, level) => level + 1).map((level) => (
                    <option
                        key={level}
                        value={String(level)}
                        className="bg-stone-950 text-stone-300"
                    >
                        {level}
                    </option>
                ))}
            </select>
            {showLock && (
                <button
                    onClick={onToggleLock}
                    type="button"
                    disabled={parentLocked || !drifId}
                    className={`p-1 flex-[0.5] flex justify-center items-center transition-colors ${locked ? "text-red-500 hover:text-red-400" : "text-stone-700 hover:text-stone-400"} ${parentLocked || !drifId ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                    title={locked ? "Odblokuj drif" : "Zablokuj drif w optymalizatorze"}
                >
                    <LockIcon locked={locked} />
                </button>
            )}
        </div>
    );
};

export default StandardDrifSlot;
