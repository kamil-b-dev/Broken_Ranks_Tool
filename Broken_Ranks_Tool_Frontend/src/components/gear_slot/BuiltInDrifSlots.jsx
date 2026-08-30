import React from "react";

/** Renders fixed drif types provided by epic and set items with editable levels. */
const BuiltInDrifSlots = ({ drifs, levels, onLevelsChange }) =>
    drifs.map((drif, index) => (
        <div
            key={`builtin-${drif.bonusType}-${index}`}
            className="flex gap-1 w-full items-center p-1.5 bg-black/60 border border-yellow-900/60 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]"
        >
            <div
                className="flex-[4] min-w-0 bg-transparent text-yellow-300 font-serif p-1 text-[10px] border-b border-yellow-900/50 text-center truncate pointer-events-none font-bold uppercase"
                title={drif.displayName}
            >
                {drif.displayName}
            </div>
            <select
                aria-label={`Poziom wbudowanego drifu ${drif.displayName}`}
                value={levels[index]}
                onChange={(event) => {
                    const next = [...levels];
                    next[index] = Number.parseInt(event.target.value);
                    onLevelsChange(next);
                }}
                className={`flex-[2] min-w-0 bg-transparent font-serif p-1 text-xs border-b outline-none text-center cursor-pointer bg-stone-950 ${drif.id ? "text-yellow-300 border-yellow-900/50 hover:border-yellow-500" : "text-rose-600 border-rose-900"}`}
                disabled={!drif.id}
            >
                {Array.from({ length: 16 }, (_, levelIndex) => levelIndex + 1).map((level) => (
                    <option key={level} value={level} className="bg-stone-950 text-stone-300">
                        {level} lvl
                    </option>
                ))}
            </select>
        </div>
    ));

export default BuiltInDrifSlots;
