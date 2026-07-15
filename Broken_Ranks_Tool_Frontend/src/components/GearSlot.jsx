import React from "react";
import { useGearSlot } from "../hooks/useGearSlot.js";
import ItemSection from "./gear_slot/ItemSection.jsx";
import OrbSection from "./gear_slot/OrbSection.jsx";
import DrifSection from "./gear_slot/DrifSection.jsx";

/**
 * Główny komponent reprezentujący pojedynczy slot na ekwipunek (np. Hełm, Broń).
 * Jego rolą jest orkiestracja i wyświetlanie sub-komponentów dla przedmiotu, orbów i drifów.
 * @param {object} props
 * @param {string} props.label Nazwa slotu (np. "Hełm").
 * @param {Array<object>} props.items Lista dostępnych przedmiotów dla tego slotu.
 * @param {Array<object>} props.drifs Lista wszystkich dostępnych drifów.
 * @param {object} props.gameRules Obiekt z globalnymi regułami gry.
 * @returns {JSX.Element}
 */
const GearSlot = (props) => {
    const { label, items, drifs, gameRules } = props;
    const { bonusTranslations = {}, drifBasePowers = {} } = gameRules || {};

    const hookData = useGearSlot(props);
    const {
        isOverCapacity, fullSelectedItem, selectedItem, dragOverZone, handleDragOver, handleDragLeave, handleDrop,
        isLegendary, orbSlots, setOrbSlots, groupedOrbs1, groupedOrbs2
    } = hookData;

    if (!gameRules) return <div className="w-64 p-3 text-xs text-stone-500 font-serif text-center border border-stone-800 bg-black">Ładowanie potęgi...</div>;

    const slotClasses = `flex flex-col items-center gap-3 w-64 p-4 bg-gradient-to-b from-stone-900 to-black transition-all duration-200 border-2 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(0,0,0,0.8)] 
        ${isOverCapacity ? "border-red-600 shadow-[inset_0_0_40px_rgba(153,27,27,0.4),0_0_20px_rgba(153,27,27,0.6)]" : "border-rose-900/80"}`;

    return (
        <div className={slotClasses}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-900 via-rose-700 to-red-900"></div>
            <span className="text-xs font-serif font-bold text-stone-400 uppercase tracking-[0.2em] pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{label}</span>

            <ItemSection
                label={label}
                items={items}
                fullSelectedItem={fullSelectedItem}
                dragOverZone={dragOverZone}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                hookData={hookData}
            />

            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-serif font-bold text-rose-800/80 uppercase tracking-widest mb-1 pointer-events-none drop-shadow-md">Orb</span>
                <OrbSection
                    slotKey="orb1"
                    selectedItem={selectedItem}
                    dragOverZone={dragOverZone}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    orbState={orbSlots.orb1}
                    setOrbState={(state) => setOrbSlots(prev => ({ ...prev, orb1: typeof state === 'function' ? state(prev.orb1) : state }))}
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
                        setOrbState={(state) => setOrbSlots(prev => ({ ...prev, orb2: typeof state === 'function' ? state(prev.orb2) : state }))}
                        groupedOrbs={groupedOrbs2}
                        bonusTranslations={bonusTranslations}
                    />
                )}
            </div>

            <DrifSection
                drifs={drifs}
                fullSelectedItem={fullSelectedItem}
                dragOverZone={dragOverZone}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                hookData={hookData}
                bonusTranslations={bonusTranslations}
                drifBasePowers={drifBasePowers}
            />
        </div>
    );
};

export default React.memo(GearSlot);
