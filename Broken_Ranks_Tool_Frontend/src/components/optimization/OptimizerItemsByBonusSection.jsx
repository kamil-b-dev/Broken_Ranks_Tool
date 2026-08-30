import React from "react";
import { SLOTS } from "../../constants/equipment";

const formatBonus = (bonus) =>
    (Number(bonus) * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 });

const getSlotLabel = (slotKey) => SLOTS.find((slot) => slot.key === slotKey)?.label || slotKey;

/** Lists optimized items grouped by their item-level drif bonus. */
const OptimizerItemsByBonusSection = ({ itemsByBonus }) => {
    const bonusGroups = Object.entries(itemsByBonus || {}).sort(
        ([left], [right]) => Number(right) - Number(left)
    );

    return (
        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-3">
                Bonus do drifów na przedmiotach
            </h5>
            {bonusGroups.length === 0 ? (
                <p className="text-xs text-stone-600 italic leading-relaxed">
                    Mapa przedmiotów pojawi się po optymalizacji.
                </p>
            ) : (
                <div className="space-y-2">
                    {bonusGroups.map(([bonus, items]) => (
                        <div
                            key={bonus}
                            className="border-b border-stone-800/70 pb-2 last:border-0 last:pb-0"
                        >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] text-stone-500 uppercase tracking-wide">
                                    Bonus do drifów
                                </span>
                                <span className="text-purple-300 font-bold text-xs tabular-nums">
                                    +{formatBonus(bonus)}%
                                </span>
                            </div>
                            <ul className="space-y-1">
                                {items.map((item) => (
                                    <li
                                        key={item.slotKey}
                                        className="flex items-start justify-between gap-2 text-xs"
                                    >
                                        <span className="text-stone-300 leading-tight">
                                            {item.itemName}
                                        </span>
                                        <span className="text-stone-600 text-[10px] uppercase tracking-wide shrink-0">
                                            {getSlotLabel(item.slotKey)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default OptimizerItemsByBonusSection;
