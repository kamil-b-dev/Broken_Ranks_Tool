import React from "react";
import { SLOTS } from "../../constants/equipment";
import { numericStatValue } from "./optimizerDomain";

const formatNumber = (value) => Number(value).toLocaleString("pl-PL", { maximumFractionDigits: 2 });

const formatPlacement = (modifier, level) =>
    modifier ? `${modifier}${level ? ` (${level})` : ""}` : "puste miejsce";

const getSlotLabel = (slotKey) => SLOTS.find((slot) => slot.key === slotKey)?.label || slotKey;

const VariantChanges = ({ variant }) => (
    <ul className="mt-2 space-y-1">
        {variant.changes.map((change, changeIndex) => (
            <li
                key={`${change.slotKey}-${changeIndex}`}
                className="text-[11px] text-stone-500 leading-snug"
            >
                <span className="text-stone-400">{change.itemName}</span> (
                {getSlotLabel(change.slotKey)}):{" "}
                {formatPlacement(change.fromModifier, change.fromLevel)} →{" "}
                <span className="text-purple-300">
                    {formatPlacement(change.toModifier, change.toLevel)}
                </span>
            </li>
        ))}
    </ul>
);

const VariantStatChanges = ({ changes, maxCaps, translations }) => (
    <div className="mt-2 pt-2 border-t border-stone-800/80 space-y-1">
        <div className="text-[9px] text-stone-600 uppercase tracking-wider">Zmiany statystyk</div>
        {changes.map((change) => {
            const before = numericStatValue(change.finalValue);
            const after = numericStatValue(change.variantValue);
            const improves =
                Number(maxCaps?.[change.statKey]) < 0 ? after < before : after > before;
            return (
                <div
                    key={change.statKey}
                    className="flex items-start justify-between gap-2 text-[11px] leading-snug"
                >
                    <span className="text-stone-400">
                        {translations?.[change.statKey] || change.statKey}
                    </span>
                    <span className="shrink-0 tabular-nums">
                        <span className="text-stone-500">{change.finalValue}</span>
                        <span className="text-stone-600"> → </span>
                        <span className={improves ? "text-emerald-400" : "text-red-400"}>
                            {change.variantValue}
                        </span>
                    </span>
                </div>
            );
        })}
    </div>
);

/** Presents alternative optimization setups and delegates selection to the workflow owner. */
const OptimizerVariantsSection = ({ variants, activeIndex, maxCaps, translations, onSelect }) => (
    <section className="border border-dashed border-stone-700/80 rounded-sm p-3 lg:col-span-2">
        <h5 className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold mb-2">
            Kolejne warianty
        </h5>
        {variants?.length > 0 ? (
            <div className="space-y-3">
                {variants.map((variant, variantIndex) => (
                    <button
                        type="button"
                        key={`${variant.bonusName}-${variantIndex}`}
                        onClick={() => onSelect(variant, variantIndex)}
                        className={`block w-full text-left border rounded-sm p-2 transition-colors ${
                            activeIndex === variantIndex
                                ? "border-purple-500/80 bg-purple-950/30"
                                : "border-stone-800/70 bg-black/20 hover:border-stone-600"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2 text-xs">
                            <span className="text-stone-300 leading-tight font-semibold">
                                {variant.main ? "Główny wynik" : variant.bonusName}
                            </span>
                            {variant.main ? (
                                <span className="text-purple-300 text-[10px] uppercase tracking-wide">
                                    {activeIndex === variantIndex ? "Aktywny" : "Ustaw"}
                                </span>
                            ) : (
                                <div className="text-right shrink-0">
                                    <div className="text-emerald-400 font-bold tabular-nums">
                                        {formatNumber(variant.finalValue)}% →{" "}
                                        {formatNumber(variant.variantValue)}%
                                    </div>
                                    <div className="mt-1 text-[9px] text-stone-500 uppercase tracking-wide tabular-nums">
                                        +{formatNumber(variant.gain)} · strata{" "}
                                        {formatNumber(variant.totalLoss)} · zmian{" "}
                                        {variant.changeCount} · ocena {formatNumber(variant.score)}
                                    </div>
                                </div>
                            )}
                        </div>
                        {!variant.main && <VariantChanges variant={variant} />}
                        {!variant.main && variant.statChanges?.length > 0 && (
                            <VariantStatChanges
                                changes={variant.statChanges}
                                maxCaps={maxCaps}
                                translations={translations}
                            />
                        )}
                    </button>
                ))}
            </div>
        ) : (
            <p className="text-xs text-stone-600 italic leading-relaxed">
                Brak ocenionych wariantów poprawiających maksymalizowany mod.
            </p>
        )}
    </section>
);

export default OptimizerVariantsSection;
