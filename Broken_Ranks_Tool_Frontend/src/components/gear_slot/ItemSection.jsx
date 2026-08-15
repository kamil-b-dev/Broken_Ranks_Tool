import React from "react";
import { getRarityColor, getStarColor } from "../../utils/formatters";

/**
 * Renders item selection, upgrade level, and drag-and-drop behavior for a slot.
 * @param {object} props Component properties.
 * @param {string} props.label User-facing slot label.
 * @param {Array<object>} props.items Items available for the slot.
 * @param {object|undefined} props.fullSelectedItem Currently selected item.
 * @param {string|null} props.dragOverZone Active drag-and-drop zone.
 * @param {Function} props.handleDragOver Drag-over event handler.
 * @param {Function} props.handleDragLeave Drag-leave event handler.
 * @param {Function} props.handleDrop Drop event handler.
 * @param {object} props.hookData State and actions returned by `useGearSlot`.
 * @returns {JSX.Element} The item section.
 */
const ItemSection = ({ label, items, fullSelectedItem, dragOverZone, handleDragOver, handleDragLeave, handleDrop, hookData }) => {
    const {
        selectedItem, setSelectedItem, itemStars, setItemStars, setBuiltInLvls,
        hoverStars, setHoverStars, setOrbSlots,
        setSelectedDrifs, setDrifTypes, setDrifLevels
    } = hookData;

    return (
        <div
            className={`w-full flex flex-col gap-1.5 p-2 bg-black/60 border transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,1)] ${dragOverZone === 'item' ? 'border-amber-700/50 bg-amber-900/10' : 'border-rose-900/70'}`}
            onDragOver={(e) => handleDragOver(e, 'item')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'item')}
        >
            <select
                value={selectedItem}
                onChange={(e) => {
                    setSelectedItem(e.target.value);
                    setItemStars(1); setBuiltInLvls([1, 1]); setHoverStars(0);
                    setOrbSlots({ orb1: { id: "", level: "", type: "" }, orb2: { id: "", level: "", type: "" } });
                    setSelectedDrifs([]); setDrifTypes({}); setDrifLevels({});
                }}
                className={`w-full bg-black/80 text-xs font-serif border border-rose-900/70 focus:border-rose-500 p-1.5 outline-none text-center cursor-pointer shadow-inner ${fullSelectedItem ? getRarityColor(fullSelectedItem.rarity) : "text-stone-300"}`}
            >
                <option value="" className="text-stone-600">-- {label} --</option>
                {items.map((i) => (
                    <option key={i.id} value={i.id} className={`bg-stone-950 ${getRarityColor(i.rarity)}`}>
                        {i.name} {i.tier ? i.tier : ""}
                    </option>
                ))}
            </select>

            <div className={`flex justify-center gap-1 bg-stone-950 p-1 border border-rose-900/70 shadow-inner transition-opacity ${!selectedItem ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                {[...Array(9)].map((_, i) => {
                    const starValue = i + 1;
                    const isFilled = starValue <= (hoverStars || itemStars);
                    return (
                        <span
                            key={starValue}
                            className={`cursor-pointer text-lg leading-none transition-all duration-150 transform hover:scale-125 drop-shadow-[0_1px_1px_rgba(0,0,0,1)] ${getStarColor(starValue, isFilled)}`}
                            onMouseEnter={() => setHoverStars(starValue)}
                            onMouseLeave={() => setHoverStars(0)}
                            onClick={() => setItemStars(starValue)}
                            title={`Wzmocnienie: ${starValue}★`}
                        >
                            ★
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default ItemSection;
