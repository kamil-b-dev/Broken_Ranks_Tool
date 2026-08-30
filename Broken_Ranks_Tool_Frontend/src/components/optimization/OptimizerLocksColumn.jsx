import { SLOTS } from "../../constants/equipment";

const LockIcon = ({ locked, small = false }) => (
    <svg
        className={small ? "h-3 w-3" : "h-3.5 w-3.5"}
        fill={locked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d={
                locked
                    ? "M7 10V7a5 5 0 0110 0v3m-11 0h12a2 2 0 012 2v7H4v-7a2 2 0 012-2z"
                    : "M8 10V7a4 4 0 118 0m-10 3h12a2 2 0 012 2v7H4v-7a2 2 0 012-2z"
            }
        />
    </svg>
);

/** Presents equipment and drif locks used as immutable optimizer input. */
const OptimizerLocksColumn = ({
    active,
    slots,
    items,
    drifs,
    lockedSlots,
    lockedDrifs,
    onToggleSlot,
    onToggleDrif,
}) => (
    <div
        className={`optimizer-workspace-column optimizer-lock-column ${active ? "flex" : "hidden"} flex-col gap-2 lg:col-span-2 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
    >
        <div className="flex min-h-[34px] shrink-0 items-center justify-center border-b border-stone-700 pb-2 mb-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-stone-300 font-serif">
                Zablokowane Sloty
            </h4>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pr-2">
            {SLOTS.map((slot) => {
                const slotData = slots?.[slot.key];
                const item = slotData?.itemId
                    ? items.find((candidate) => String(candidate.id) === String(slotData.itemId))
                    : null;
                const slotLocked = lockedSlots?.includes(slot.key);

                return (
                    <div
                        key={slot.key}
                        className={`flex min-w-0 flex-col rounded-sm border bg-stone-950/60 transition-all ${slotLocked ? "border-purple-700/60 shadow-[inset_0_0_15px_rgba(88,40,130,0.24)]" : "border-stone-800/80 hover:border-purple-800"}`}
                    >
                        <div className="flex items-center justify-between border-b border-stone-800/60 bg-black/60 p-2">
                            <span
                                className={`text-[10px] font-bold uppercase tracking-widest ${slotLocked ? "text-red-500" : "text-stone-400"}`}
                            >
                                {slot.label}
                            </span>
                            {item && (
                                <button
                                    type="button"
                                    onClick={() => onToggleSlot(slot.key)}
                                    title={slotLocked ? "Odblokuj slot" : "Zablokuj cały slot"}
                                    className={`rounded-sm p-1 transition-colors ${slotLocked ? "bg-red-950/40 text-red-500 hover:text-red-400" : "bg-stone-900 text-stone-600 hover:text-stone-300"}`}
                                >
                                    <LockIcon locked={slotLocked} />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5 p-2">
                            {item ? (
                                <>
                                    <div
                                        className={`truncate pb-1 text-xs font-bold ${slotLocked ? "text-stone-500" : "text-stone-300"}`}
                                    >
                                        {item.name}
                                    </div>
                                    {slotData.drifIds?.map((drifId, index) => {
                                        const drif = drifs.find(
                                            (candidate) => String(candidate.id) === String(drifId)
                                        );
                                        const drifLocked =
                                            lockedDrifs?.[slot.key]?.includes(index) || slotLocked;
                                        return (
                                            <div
                                                key={`${slot.key}-${index}`}
                                                className={`flex items-center justify-between rounded-sm border bg-black/40 p-1 ${drifLocked && !slotLocked ? "border-red-900/40" : "border-stone-800/60"}`}
                                            >
                                                <span
                                                    className={`truncate pr-2 text-[10px] ${drif ? (drifLocked ? "text-red-400/80" : "text-amber-600/80") : "italic text-stone-700"}`}
                                                >
                                                    {drif
                                                        ? `${drif.name} (${drif.size})`
                                                        : "Pusty drif"}
                                                </span>
                                                {drif && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onToggleDrif(slot.key, index)
                                                        }
                                                        disabled={slotLocked}
                                                        title={
                                                            drifLocked
                                                                ? "Odblokuj drif"
                                                                : "Zablokuj drif"
                                                        }
                                                        className={`shrink-0 p-1 transition-colors ${drifLocked ? "text-red-500" : "text-stone-600 hover:text-stone-400"} ${slotLocked ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
                                                    >
                                                        <LockIcon locked={drifLocked} small />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <span className="py-1 text-[10px] italic text-stone-600">
                                    Brak założonego przedmiotu
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

export default OptimizerLocksColumn;
