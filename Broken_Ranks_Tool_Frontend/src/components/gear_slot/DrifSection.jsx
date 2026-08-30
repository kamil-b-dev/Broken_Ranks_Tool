import React from "react";
import { useEquipment } from "../../context/EquipmentContext";
import BuiltInDrifSlots from "./BuiltInDrifSlots";
import StandardDrifSlot from "./StandardDrifSlot";

/**
 * Renders built-in and standard drif slots, capacity, levels, and locks.
 * @param {object} props Component properties.
 * @param {string} props.slotKey Parent equipment slot identifier.
 * @param {Array<object>} props.drifs Available drif templates.
 * @param {object|null} props.fullSelectedItem Currently selected item.
 * @param {string|null} props.dragOverZone Active drag-and-drop zone.
 * @param {Function} props.handleDragOver Drag-over event handler.
 * @param {Function} props.handleDragLeave Drag-leave event handler.
 * @param {Function} props.handleDrop Drop event handler.
 * @param {object} props.hookData State and actions returned by `useGearSlot`.
 * @param {object} props.bonusTranslations Bonus display translations.
 * @param {object} props.drifBasePowers Base power by drif bonus type.
 * @param {boolean} props.showOptimizationLocks Whether optimizer lock controls are visible.
 * @returns {JSX.Element} The drif section.
 */
const DrifSection = ({
    slotKey,
    drifs,
    fullSelectedItem,
    dragOverZone,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    hookData,
    bonusTranslations,
    drifBasePowers,
    showOptimizationLocks = false,
}) => {
    const {
        isEpicOrSet,
        builtInDrifs,
        builtInLvls,
        setBuiltInLvls,
        maxDrifs,
        maxDrifIndex,
        itemCapacity,
        currentPowerUsed,
        isOverCapacity,
        isAtMaxCapacity,
        capacityPercentage,
        selectedDrifs,
        setSelectedDrifs,
        drifTypes,
        setDrifTypes,
        drifLevels,
        setDrifLevels,
        groupByType,
    } = hookData;

    const { lockedDrifs, toggleDrifLock, lockedSlots } = useEquipment();

    const isParentSlotLocked = lockedSlots?.includes(slotKey) || false;

    /**
     * Returns whether a drif is locked directly or through its parent slot.
     * @param {number} index Drif position within the slot.
     * @returns {boolean} Whether the drif is locked.
     */
    const isDrifLocked = (index) => {
        if (!showOptimizationLocks) return false;
        if (isParentSlotLocked) return true;
        const locksForSlot = lockedDrifs?.[slotKey] || [];
        return locksForSlot.includes(index);
    };

    return (
        <div className="w-full flex flex-col items-center mt-1">
            <div className="w-full flex justify-between items-center mb-1">
                <span className="text-[10px] font-serif font-bold text-amber-800/80 uppercase tracking-widest pointer-events-none drop-shadow-md">
                    Drify
                </span>
                {fullSelectedItem && itemCapacity > 0 && (
                    <span
                        className={`text-[10px] font-serif font-bold uppercase tracking-wider ${isOverCapacity ? "text-red-500 animate-pulse" : isAtMaxCapacity ? "text-amber-500" : "text-stone-500"}`}
                    >
                        Pojemność: {currentPowerUsed}/{itemCapacity}
                    </span>
                )}
            </div>

            {fullSelectedItem && itemCapacity > 0 && (
                <div className="w-full bg-black border border-rose-900/70 shadow-inner h-1 mb-2">
                    <div
                        className={`h-full transition-all duration-300 ${isOverCapacity ? "bg-gradient-to-r from-rose-900 to-red-600" : isAtMaxCapacity ? "bg-gradient-to-r from-amber-700 to-amber-500" : "bg-gradient-to-r from-stone-700 to-stone-400"}`}
                        style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                </div>
            )}

            <div className="flex flex-col w-full gap-2 items-center">
                {isEpicOrSet && (
                    <BuiltInDrifSlots
                        drifs={builtInDrifs}
                        levels={builtInLvls}
                        onLevelsChange={setBuiltInLvls}
                    />
                )}

                {!isEpicOrSet &&
                    Array.from({ length: maxDrifs }).map((_, index) => (
                        <StandardDrifSlot
                            key={index}
                            index={index}
                            drifs={drifs}
                            selectedDrifs={selectedDrifs}
                            drifTypes={drifTypes}
                            drifLevels={drifLevels}
                            maxDrifIndex={maxDrifIndex}
                            bonusTranslations={bonusTranslations}
                            drifBasePowers={drifBasePowers}
                            groupByType={groupByType}
                            locked={isDrifLocked(index)}
                            parentLocked={isParentSlotLocked}
                            showLock={showOptimizationLocks}
                            overCapacity={isOverCapacity}
                            dragActive={dragOverZone === `drif-${index}`}
                            onDragOver={(event) => handleDragOver(event, `drif-${index}`)}
                            onDragLeave={handleDragLeave}
                            onDrop={(event) => handleDrop(event, `drif-${index}`)}
                            onToggleLock={() => toggleDrifLock(slotKey, index)}
                            setSelectedDrifs={setSelectedDrifs}
                            setDrifTypes={setDrifTypes}
                            setDrifLevels={setDrifLevels}
                        />
                    ))}
                {!fullSelectedItem && (
                    <span className="text-[10px] font-serif text-stone-600 uppercase tracking-widest mt-1 pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                        Oczekiwanie...
                    </span>
                )}
            </div>
        </div>
    );
};

export default DrifSection;
