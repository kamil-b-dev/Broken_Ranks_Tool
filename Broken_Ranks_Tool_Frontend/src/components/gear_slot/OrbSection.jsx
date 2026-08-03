import React from "react";
import { formatGroupLabel } from "../../utils/formatters";

/**
 * Komponent sekcji orba w slocie ekwipunku.
 * Umożliwia wybór rodzaju, wielkości i poziomu orba.
 * Obsługuje również logikę przeciągania i upuszczania orbów.
 *
 * @param {object} props
 * @param {string} props.slotKey Klucz identyfikujący slot orba (np. "orb1").
 * @param {object} props.selectedItem Aktualnie wybrany przedmiot w slocie.
 * @param {string|null} props.dragOverZone Strefa, nad którą aktualnie przeciągany jest element.
 * @param {Function} props.handleDragOver Funkcja obsługująca zdarzenie przeciągania nad strefą.
 * @param {Function} props.handleDragLeave Funkcja obsługująca zdarzenie opuszczenia strefy przeciągania.
 * @param {Function} props.handleDrop Funkcja obsługująca zdarzenie upuszczenia elementu.
 * @param {object} props.orbState Stan aktualnie wybranego orba (typ, id, poziom).
 * @param {Function} props.setOrbState Funkcja do aktualizacji stanu orba.
 * @param {object} props.groupedOrbs Orby pogrupowane według typu.
 * @param {object} props.bonusTranslations Tłumaczenia nazw bonusów.
 * @returns {JSX.Element}
 */
const OrbSection = ({ slotKey, selectedItem, dragOverZone, handleDragOver, handleDragLeave, handleDrop, orbState, setOrbState, groupedOrbs, bonusTranslations }) => {
    const currentOrbObj = groupedOrbs[orbState.type]?.find(o => o.id.toString() === orbState.id);
    const isSubOrb = currentOrbObj?.size?.toUpperCase() === "SUBORB";
    const availableOrbLevels = isSubOrb ? [1] : [1, 2, 3];

    return (
        <div
            className={`flex gap-1 w-full items-center mb-1 p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${dragOverZone === slotKey ? 'border-amber-700/50 bg-amber-950/20' : 'border-rose-900/70'}`}
            onDragOver={(e) => handleDragOver(e, slotKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, slotKey)}
        >
            <select
                value={orbState.type}
                onChange={(e) => setOrbState({ type: e.target.value, id: "", level: "" })}
                disabled={!selectedItem}
                className="flex-[3] min-w-0 bg-transparent text-rose-700 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center cursor-pointer disabled:opacity-30"
            >
                <option value="" className="bg-stone-950 text-stone-500">Rodzaj</option>
                {Object.keys(groupedOrbs).map(type => (
                    <option key={type} value={type} className="bg-stone-950 text-stone-300">
                        {formatGroupLabel(type, groupedOrbs[type], bonusTranslations)}
                    </option>
                ))}
            </select>

            <select
                value={orbState.id}
                onChange={(e) => setOrbState(prev => ({ ...prev, id: e.target.value, level: isSubOrb ? "1" : "" }))}
                disabled={!orbState.type}
                className="flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer"
            >
                <option value="" className="bg-stone-950 text-stone-500">Wielkość</option>
                {orbState.type && groupedOrbs[orbState.type]?.map((orb) => (
                    <option key={orb.id} value={orb.id} className="text-stone-300 bg-stone-950">{orb.size || orb.tier}</option>
                ))}
            </select>

            <select
                value={orbState.level}
                onChange={(e) => setOrbState(prev => ({ ...prev, level: e.target.value }))}
                disabled={!orbState.id || isSubOrb}
                className="flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer"
            >
                <option value="" className="bg-stone-950 text-stone-500">lvl</option>
                {availableOrbLevels.map(num => (
                    <option key={num} value={num.toString()} className="bg-stone-950 text-stone-300">{num}</option>
                ))}
            </select>
        </div>
    );
};

export default OrbSection;
