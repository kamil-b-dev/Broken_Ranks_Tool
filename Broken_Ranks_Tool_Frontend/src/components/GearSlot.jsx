import React from "react";
import { useGearSlot } from "../hooks/useGearSlot.js";
import { useEquipment } from "../context/EquipmentContext";
import ItemSection from "./gear_slot/ItemSection.jsx";
import OrbSection from "./gear_slot/OrbSection.jsx";
import DrifSection from "./gear_slot/DrifSection.jsx";

/**
 * Renders one equipment slot with item, orb, and drif sections.
 *
 * @param {object} props Component properties.
 * @param {string} props.label User-facing slot label.
 * @param {Array<object>} props.items Items available for the slot.
 * @param {Array<object>} props.drifs Drifs available for the slot.
 * @param {object} props.gameRules Rules used by the slot sections.
 * @param {string} props.slotKey Stable equipment slot identifier.
 * @param {boolean} props.expanded Whether to render the wide selected-slot editor.
 * @param {boolean} props.showOptimizationLocks Whether optimizer lock controls are visible.
 * @returns {JSX.Element} The rendered equipment slot.
 */
const GearSlot = (props) => {
    const {
        label,
        items,
        drifs,
        gameRules,
        slotKey,
        expanded = false,
        showOptimizationLocks = false,
    } = props;
    const { bonusTranslations = {}, drifBasePowers = {} } = gameRules || {};

    const hookData = useGearSlot(props);
    const {
        isOverCapacity,
        fullSelectedItem,
        selectedItem,
        dragOverZone,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        isLegendary,
        orbSlots,
        setOrbSlots,
        groupedOrbs1,
        groupedOrbs2,
    } = hookData;

    const { lockedSlots, toggleSlotLock } = useEquipment();

    const isSlotLocked = lockedSlots?.includes(slotKey) || false;

    if (!gameRules)
        return (
            <div className="w-64 p-3 text-xs text-stone-500 font-serif text-center border border-stone-800 bg-black">
                Ładowanie reguł...
            </div>
        );

    const slotClasses = `gear-slot-editor ${expanded ? "gear-slot-editor-expanded" : "w-64"} flex flex-col items-center gap-3 p-4 bg-gradient-to-b from-stone-900/95 to-black transition-all duration-200 border-2 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(0,0,0,0.8)] hover:border-rose-700
        ${isOverCapacity ? "border-red-600 shadow-[inset_0_0_40px_rgba(153,27,27,0.4),0_0_20px_rgba(153,27,27,0.6)]" : "border-rose-900/80"}
        ${isSlotLocked ? "opacity-90 grayscale-[0.3]" : ""}`;

    return (
        <div className={slotClasses}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-900 via-rose-700 to-red-900"></div>

            <div className="flex w-full justify-between items-center px-1 mb-1 relative z-10">
                <span className="text-xs font-serif font-bold text-stone-400 uppercase tracking-[0.2em] pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                    {label}
                </span>

                {showOptimizationLocks && fullSelectedItem && (
                    <button
                        onClick={() => toggleSlotLock(slotKey)}
                        type="button"
                        className={`transition-colors p-1 rounded-sm ${isSlotLocked ? "text-red-500 hover:text-red-400 bg-red-950/40 border border-red-900/50" : "text-stone-600 hover:text-stone-300"}`}
                        title={isSlotLocked ? "Odblokuj slot" : "Zablokuj slot w optymalizatorze"}
                    >
                        {isSlotLocked ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="w-4 h-4"
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

            <div className="gear-slot-item-section w-full">
                <ItemSection
                    slotKey={slotKey}
                    label={label}
                    items={items}
                    fullSelectedItem={fullSelectedItem}
                    dragOverZone={dragOverZone}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    hookData={hookData}
                />
            </div>

            <div className="gear-slot-orb-section w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-serif font-bold text-rose-800/80 uppercase tracking-widest mb-1 pointer-events-none drop-shadow-md">
                    Orb
                </span>
                <OrbSection
                    slotKey="orb1"
                    selectedItem={selectedItem}
                    dragOverZone={dragOverZone}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    orbState={orbSlots.orb1}
                    setOrbState={(state) =>
                        setOrbSlots((prev) => ({
                            ...prev,
                            orb1: typeof state === "function" ? state(prev.orb1) : state,
                        }))
                    }
                    groupedOrbs={groupedOrbs1}
                    bonusTranslations={bonusTranslations}
                />
                {isLegendary && (
                    <OrbSection
                        slotKey="orb2"
                        selectedItem={selectedItem}
                        dragOverZone={dragOverZone}
                        handleDragOver={handleDragOver}
                        handleDragLeave={handleDragLeave}
                        handleDrop={handleDrop}
                        orbState={orbSlots.orb2}
                        setOrbState={(state) =>
                            setOrbSlots((prev) => ({
                                ...prev,
                                orb2: typeof state === "function" ? state(prev.orb2) : state,
                            }))
                        }
                        groupedOrbs={groupedOrbs2}
                        bonusTranslations={bonusTranslations}
                    />
                )}
            </div>

            <div className="gear-slot-drif-section w-full">
                <DrifSection
                    slotKey={slotKey}
                    drifs={drifs}
                    fullSelectedItem={fullSelectedItem}
                    dragOverZone={dragOverZone}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    hookData={hookData}
                    bonusTranslations={bonusTranslations}
                    drifBasePowers={drifBasePowers}
                    showOptimizationLocks={showOptimizationLocks}
                />
            </div>
        </div>
    );
};

export default React.memo(GearSlot);
