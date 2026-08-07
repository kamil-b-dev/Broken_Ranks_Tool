import React from "react";
import { getDrifMaxLvl, formatGroupLabel } from "../../utils/formatters";
import { useEquipment } from "../../context/EquipmentContext"; // Import kontekstu dla blokad

const DRIF_MULTIPLIERS = {
    "SUBDRIF": 1,
    "BIDRIF": 2,
    "MAGNIDRIF": 3,
    "ARCYDRIF": 4,
};

/**
 * Komponent sekcji do zarządzania drifami w przedmiocie.
 * @param {object} props
 * @param {string} props.slotKey Klucz identyfikujący slot (np. "helmet").
 * @param {Array<object>} props.drifs Lista wszystkich dostępnych drifów.
 * @param {object} props.fullSelectedItem Pełny obiekt wybranego przedmiotu.
 * @param {string|null} props.dragOverZone Aktualna strefa, nad którą jest przeciągany element.
 * @param {Function} props.handleDragOver Funkcja obsługująca zdarzenie onDragOver.
 * @param {Function} props.handleDragLeave Funkcja obsługująca zdarzenie onDragLeave.
 * @param {Function} props.handleDrop Funkcja obsługująca zdarzenie onDrop.
 * @param {object} props.hookData Obiekt z danymi i funkcjami z hooka useGearSlot.
 * @param {object} props.bonusTranslations Mapa tłumaczeń dla bonusów.
 * @param {object} props.drifBasePowers Mapa mocy bazowych dla drifów.
 * @returns {JSX.Element}
 */
const DrifSection = ({ slotKey, drifs, fullSelectedItem, dragOverZone, handleDragOver, handleDragLeave, handleDrop, hookData, bonusTranslations, drifBasePowers }) => {
    const {
        isEpicOrSet, builtInDrifs, builtInLvls, setBuiltInLvls, maxDrifs, maxDrifIndex, itemCapacity,
        currentPowerUsed, isOverCapacity, isAtMaxCapacity, capacityPercentage,
        selectedDrifs, setSelectedDrifs, drifTypes, setDrifTypes, drifLevels, setDrifLevels, groupByType
    } = hookData;

    const { lockedDrifs, toggleDrifLock, lockedSlots } = useEquipment();

    const isParentSlotLocked = lockedSlots?.includes(slotKey) || false;

    const isDrifLocked = (index) => {
        if (isParentSlotLocked) return true;
        const locksForSlot = lockedDrifs?.[slotKey] || [];
        return locksForSlot.includes(index);
    };

    const sizeIndexMap = { "SUBDRIF": 0, "BIDRIF": 1, "MAGNIDRIF": 2, "ARCYDRIF": 3 };

    return (
        <div className="w-full flex flex-col items-center mt-1">
            <div className="w-full flex justify-between items-center mb-1">
                <span className="text-[10px] font-serif font-bold text-amber-800/80 uppercase tracking-widest pointer-events-none drop-shadow-md">Drify</span>
                {fullSelectedItem && itemCapacity > 0 && (
                    <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${isOverCapacity ? 'text-red-500 animate-pulse' : (isAtMaxCapacity ? 'text-amber-500' : 'text-stone-500')}`}>
                        Pojemność: {currentPowerUsed}/{itemCapacity}
                    </span>
                )}
            </div>

            {fullSelectedItem && itemCapacity > 0 && (
                <div className="w-full bg-black border border-rose-900/70 shadow-inner h-1 mb-2">
                    <div
                        className={`h-full transition-all duration-300 ${isOverCapacity ? 'bg-gradient-to-r from-rose-900 to-red-600' : (isAtMaxCapacity ? 'bg-gradient-to-r from-amber-700 to-amber-500' : 'bg-gradient-to-r from-stone-700 to-stone-400')}`}
                        style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                </div>
            )}

            <div className="flex flex-col w-full gap-2 items-center">
                {isEpicOrSet && builtInDrifs.map((drifObj, idx) => (
                    <div key={`builtin-${idx}`} className="flex gap-1 w-full items-center p-1.5 bg-black/60 border border-yellow-900/60 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                        <div className="flex-[4] min-w-0 bg-transparent text-yellow-300 font-serif p-1 text-[10px] border-b border-yellow-900/50 text-center truncate pointer-events-none font-bold uppercase" title={drifObj.displayName}>
                            {drifObj.displayName}
                        </div>
                        <select
                            value={builtInLvls[idx]}
                            onChange={(e) => {
                                const newLvls = [...builtInLvls];
                                newLvls[idx] = parseInt(e.target.value);
                                setBuiltInLvls(newLvls);
                            }}
                            className={`flex-[2] min-w-0 bg-transparent font-serif p-1 text-xs border-b outline-none text-center cursor-pointer bg-stone-950 ${drifObj.id ? 'text-yellow-300 border-yellow-900/50 hover:border-yellow-500' : 'text-rose-600 border-rose-900'}`}
                            disabled={!drifObj.id}
                        >
                            {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num} className="bg-stone-950 text-stone-300">{num} lvl</option>
                            ))}
                        </select>
                    </div>
                ))}

                {!isEpicOrSet && Array.from({ length: maxDrifs }).map((_, index) => {
                    const drifId = selectedDrifs[index] || "";
                    const currentType = drifTypes[index] || "";
                    const localUsedBonusTypes = selectedDrifs.map((dId, i) => i !== index && dId ? drifs.find(dr => dr.id.toString() === dId.toString())?.bonusType : null).filter(Boolean);

                    const allowedDrifs = drifs.filter(drif => {
                        if (drifId && drif.id.toString() === drifId.toString()) return true;

                        if (!drif.size) return false;
                        if (localUsedBonusTypes.includes(drif.bonusType)) return false;
                        const drifSizeIdx = sizeIndexMap[drif.size.toUpperCase()] ?? -1;
                        if (drifSizeIdx === -1 || drifSizeIdx > maxDrifIndex) return false;
                        return true;
                    });

                    const currentGroupedDrifs = groupByType(allowedDrifs);
                    const currentDrifObj = drifs.find(d => d.id.toString() === drifId.toString());
                    const maxLvl = currentDrifObj ? getDrifMaxLvl(currentDrifObj.size) : 21;
                    const drifLocked = isDrifLocked(index);

                    return (
                        <div
                            key={index}
                            className={`flex gap-1 w-full items-center p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] 
                            ${dragOverZone === `drif-${index}` ? 'border-amber-800/50 bg-amber-950/20' : 'border-rose-900/70'}
                            ${drifLocked ? 'border-red-900/60 bg-red-950/10' : ''}`}
                            onDragOver={drifLocked ? undefined : (e) => handleDragOver(e, `drif-${index}`)}
                            onDragLeave={drifLocked ? undefined : handleDragLeave}
                            onDrop={drifLocked ? undefined : (e) => handleDrop(e, `drif-${index}`)}
                        >
                            <select
                                value={currentType}
                                disabled={drifLocked}
                                onChange={(e) => {
                                    setDrifTypes(prev => ({ ...prev, [index]: e.target.value }));
                                    setSelectedDrifs(prev => { const next = [...prev]; next[index] = ""; return next; });
                                    setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                }}
                                className={`flex-[3] min-w-0 bg-transparent text-amber-600 font-serif p-1 text-xs border-b outline-none text-center ${drifLocked ? 'opacity-70 cursor-not-allowed border-red-900/50' : 'border-rose-900/70 focus:border-rose-500 cursor-pointer'} ${isOverCapacity && !drifLocked ? 'border-red-500/80' : ''}`}
                            >
                                <option value="" className="bg-stone-950 text-stone-500">Rodzaj</option>
                                {Object.keys(currentGroupedDrifs).map(type => (
                                    <option key={type} value={type} className="bg-stone-950 text-stone-300">
                                        {formatGroupLabel(type, currentGroupedDrifs[type], bonusTranslations)}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={drifId}
                                disabled={!currentType || drifLocked}
                                onChange={(e) => {
                                    setSelectedDrifs(prev => { const next = [...prev]; next[index] = e.target.value; return next; });
                                    setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                }}
                                className={`flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b outline-none text-center disabled:opacity-30 ${drifLocked ? 'cursor-not-allowed border-red-900/50' : 'border-rose-900/70 focus:border-rose-500 cursor-pointer'} ${isOverCapacity && !drifLocked ? 'border-red-500/80' : ''}`}
                            >
                                <option value="" className="bg-stone-950 text-stone-500">Wielkość</option>
                                {currentType && currentGroupedDrifs[currentType]?.map((d) => {
                                    const multiplier = d.size ? (DRIF_MULTIPLIERS[d.size.toUpperCase()] || 1) : 1;
                                    const basePwr = drifBasePowers[d.bonusType] || 0;
                                    const minPwr = basePwr * 1;
                                    const maxPwr = basePwr * multiplier;
                                    const labelPwr = minPwr === maxPwr ? `${minPwr}p` : `${minPwr}-${maxPwr}p`;
                                    return <option key={d.id} value={d.id} className="bg-stone-950 text-stone-300">{d.size || d.tier} ({labelPwr})</option>;
                                })}
                            </select>

                            <select
                                value={drifLevels[index] || ""}
                                disabled={!drifId || drifLocked}
                                onChange={(e) => setDrifLevels(prev => ({ ...prev, [index]: parseInt(e.target.value) }))}
                                className={`flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b outline-none text-center disabled:opacity-30 ${drifLocked ? 'cursor-not-allowed border-red-900/50' : 'border-rose-900/70 focus:border-rose-500 cursor-pointer'} ${isOverCapacity && !drifLocked ? 'border-red-500/80' : ''}`}
                            >
                                <option value="" className="bg-stone-950 text-stone-500">lvl</option>
                                {Array.from({ length: maxLvl }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num.toString()} className="bg-stone-950 text-stone-300">{num}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => toggleDrifLock(slotKey, index)}
                                disabled={isParentSlotLocked || !drifId}
                                className={`p-1 flex-[0.5] flex justify-center items-center transition-colors 
                                    ${drifLocked ? 'text-red-500 hover:text-red-400' : 'text-stone-700 hover:text-stone-400'} 
                                    ${(isParentSlotLocked || !drifId) ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                title={drifLocked ? "Odblokuj drif" : "Zablokuj drif w optymalizatorze"}
                            >
                                {drifLocked ? (
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    );
                })}

                {!fullSelectedItem && (
                    <span className="text-[10px] font-serif text-stone-600 uppercase tracking-widest mt-1 pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">Oczekiwanie...</span>
                )}
            </div>
        </div>
    );
};

export default DrifSection;