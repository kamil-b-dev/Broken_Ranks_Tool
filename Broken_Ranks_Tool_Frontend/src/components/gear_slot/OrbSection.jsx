import React from "react";
import { formatGroupLabel } from "../../utils/formatters";

/**
 * Renders orb selection, leveling, and drag-and-drop behavior for a slot.
 * @param {object} props Component properties.
 * @param {string} props.slotKey Orb slot identifier.
 * @param {object} props.selectedItem Item currently selected in the parent slot.
 * @param {string|null} props.dragOverZone Active drag-and-drop zone.
 * @param {Function} props.handleDragOver Drag-over event handler.
 * @param {Function} props.handleDragLeave Drag-leave event handler.
 * @param {Function} props.handleDrop Drop event handler.
 * @param {object} props.orbState Selected orb type, identifier, and level.
 * @param {Function} props.setOrbState Callback for updating orb state.
 * @param {object} props.groupedOrbs Orbs grouped by bonus type.
 * @param {object} props.bonusTranslations Bonus display translations.
 * @returns {JSX.Element} The orb section.
 */
const OrbSection = ({
    slotKey,
    selectedItem,
    dragOverZone,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    orbState,
    setOrbState,
    groupedOrbs,
    bonusTranslations,
}) => {
    const currentOrbObj = groupedOrbs[orbState.type]?.find((o) => o.id.toString() === orbState.id);
    const isSubOrb = currentOrbObj?.size?.toUpperCase() === "SUBORB";
    const availableOrbLevels = isSubOrb ? [1] : [1, 2, 3];

    return (
        <div
            className={`flex gap-1 w-full items-center mb-1 p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${dragOverZone === slotKey ? "border-amber-700/50 bg-amber-950/20" : "border-rose-900/70"}`}
            onDragOver={(e) => handleDragOver(e, slotKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, slotKey)}
        >
            <select
                value={orbState.type}
                aria-label="Wybierz rodzaj orba"
                onChange={(e) => setOrbState({ type: e.target.value, id: "", level: "" })}
                disabled={!selectedItem}
                className="flex-[3] min-w-0 bg-transparent text-rose-700 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center cursor-pointer disabled:opacity-30"
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    Rodzaj
                </option>
                {Object.keys(groupedOrbs).map((type) => (
                    <option key={type} value={type} className="bg-stone-950 text-stone-300">
                        {formatGroupLabel(type, groupedOrbs[type], bonusTranslations)}
                    </option>
                ))}
            </select>

            <select
                value={orbState.id}
                aria-label="Wybierz wielkość orba"
                onChange={(e) =>
                    setOrbState((prev) => ({
                        ...prev,
                        id: e.target.value,
                        level: isSubOrb ? "1" : "",
                    }))
                }
                disabled={!orbState.type}
                className="flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer"
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    Wielkość
                </option>
                {orbState.type &&
                    groupedOrbs[orbState.type]?.map((orb) => (
                        <option key={orb.id} value={orb.id} className="text-stone-300 bg-stone-950">
                            {orb.size || orb.tier}
                        </option>
                    ))}
            </select>

            <select
                value={orbState.level}
                aria-label="Wybierz poziom orba"
                onChange={(e) => setOrbState((prev) => ({ ...prev, level: e.target.value }))}
                disabled={!orbState.id || isSubOrb}
                className="flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer"
            >
                <option value="" className="bg-stone-950 text-stone-500">
                    lvl
                </option>
                {availableOrbLevels.map((num) => (
                    <option
                        key={num}
                        value={num.toString()}
                        className="bg-stone-950 text-stone-300"
                    >
                        {num}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default OrbSection;
