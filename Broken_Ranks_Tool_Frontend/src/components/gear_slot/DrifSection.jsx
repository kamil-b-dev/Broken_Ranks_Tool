import React from "react";
import { getDrifMaxLvl, formatGroupLabel } from "../../utils/formatters";

const DRIF_MULTIPLIERS = {
    "SUBDRIF": 1,
    "BIDRIF": 2,
    "MAGNIDRIF": 3,
    "ARCYDRIF": 4,
};

/**
 * @param {{
 *  drifs: Array<object>,
 *  fullSelectedItem: object | undefined,
 *  dragOverZone: string | null,
 *  handleDragOver: Function,
 *  handleDragLeave: Function,
 *  handleDrop: Function,
 *  hookData: object,
 *  bonusTranslations: object,
 *  drifBasePowers: object
 * }} props
 */
const DrifSection = ({ drifs, fullSelectedItem, dragOverZone, handleDragOver, handleDragLeave, handleDrop, hookData, bonusTranslations, drifBasePowers }) => {
    const {
        isEpicOrSet, builtInDrifs, builtInLvls, setBuiltInLvls, maxDrifs, maxDrifIndex, itemCapacity,
        currentPowerUsed, isOverCapacity, isAtMaxCapacity, capacityPercentage,
        selectedDrifs, setSelectedDrifs, drifTypes, setDrifTypes, drifLevels, setDrifLevels, groupByType
    } = hookData;

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
                        <div className="flex-[4] min-w-0 bg-transparent text-yellow-0300 font-serif p-1 text-[10px] border-b border-yellow-900/50 text-center truncate pointer-events-none font-bold uppercase" title={drifObj.displayName}>
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
                        if (!drif.size) return false;
                        if (localUsedBonusTypes.includes(drif.bonusType)) return false;
                        const drifSizeIdx = sizeIndexMap[drif.size.toUpperCase()] ?? -1;
                        if (drifSizeIdx === -1 || drifSizeIdx > maxDrifIndex) return false;
                        return true;
                    });

                    const currentGroupedDrifs = groupByType(allowedDrifs);
                    const currentDrifObj = drifs.find(d => d.id.toString() === drifId.toString());
                    const maxLvl = currentDrifObj ? getDrifMaxLvl(currentDrifObj.size) : 21;

                    return (
                        <div
                            key={index}
                            className={`flex gap-1 w-full items-center p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${dragOverZone === `drif-${index}` ? 'border-amber-800/50 bg-amber-950/20' : 'border-rose-900/70'}`}
                            onDragOver={(e) => handleDragOver(e, `drif-${index}`)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, `drif-${index}`)}
                        >
                            <select
                                value={currentType}
                                onChange={(e) => {
                                    setDrifTypes(prev => ({ ...prev, [index]: e.target.value }));
                                    setSelectedDrifs(prev => { const next = [...prev]; next[index] = ""; return next; });
                                    setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                }}
                                className={`flex-[3] min-w-0 bg-transparent text-amber-600 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center cursor-pointer ${isOverCapacity ? 'border-red-500/80' : 'border-rose-900/70'}`}
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
                                onChange={(e) => {
                                    setSelectedDrifs(prev => { const next = [...prev]; next[index] = e.target.value; return next; });
                                    setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                }}
                                disabled={!currentType}
                                className={`flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer ${isOverCapacity ? 'border-red-500/80' : 'border-rose-900/70'}`}
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
                                onChange={(e) => setDrifLevels(prev => ({ ...prev, [index]: parseInt(e.target.value) }))}
                                disabled={!drifId}
                                className={`flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-rose-900/70 focus:border-rose-500 outline-none text-center disabled:opacity-30 cursor-pointer ${isOverCapacity ? 'border-red-500/80' : 'border-rose-900/70'}`}
                            >
                                <option value="" className="bg-stone-950 text-stone-500">lvl</option>
                                {Array.from({ length: maxLvl }, (_, i) => i + 1).map(num => (
                                    <option key={num} value={num.toString()} className="bg-stone-950 text-stone-300">{num}</option>
                                ))}
                            </select>
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
