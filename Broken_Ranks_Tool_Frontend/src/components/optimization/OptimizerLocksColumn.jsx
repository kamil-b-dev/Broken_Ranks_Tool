import { useMemo, useState } from "react";
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
}) => {
    const equippedSlots = useMemo(
        () =>
            SLOTS.map((slot) => {
                const slotData = slots?.[slot.key];
                const item = slotData?.itemId
                    ? items.find((candidate) => String(candidate.id) === String(slotData.itemId))
                    : null;
                return { slot, slotData, item };
            }),
        [items, slots]
    );
    const [filter, setFilter] = useState("all");
    const [expandedSlot, setExpandedSlot] = useState(
        () => equippedSlots.find(({ item }) => item)?.slot.key || null
    );
    const lockedDrifCount = Object.values(lockedDrifs || {}).reduce(
        (total, indexes) => total + (indexes?.length || 0),
        0
    );
    const visibleSlots = equippedSlots.filter(
        ({ slot }) => filter === "all" || lockedSlots?.includes(slot.key)
    );

    return (
        <section
            className={`optimizer-workspace-column optimizer-lock-column ${active ? "flex" : "hidden"} flex-col lg:flex`}
            aria-labelledby="optimizer-locks-heading"
        >
            <header className="optimizer-column-heading">
                <div>
                    <span className="optimizer-heading-icon" aria-hidden="true">
                        ◈
                    </span>
                    <h3 id="optimizer-locks-heading">Blokady buildu</h3>
                </div>
                <p>Zablokowane elementy pozostaną bez zmian.</p>
            </header>
            <div className="optimizer-lock-filters" role="group" aria-label="Filtr blokad">
                <button
                    type="button"
                    aria-pressed={filter === "all"}
                    onClick={() => setFilter("all")}
                >
                    Wszystkie
                </button>
                <button
                    type="button"
                    aria-pressed={filter === "locked"}
                    onClick={() => setFilter("locked")}
                >
                    Zablokowane
                </button>
            </div>
            <div className="optimizer-lock-list custom-scrollbar">
                {visibleSlots.map(({ slot, slotData, item }) => {
                    const slotLocked = lockedSlots?.includes(slot.key);
                    const expanded = expandedSlot === slot.key;
                    return (
                        <article
                            key={slot.key}
                            className={`optimizer-lock-card ${slotLocked ? "optimizer-lock-card-locked" : ""}`}
                        >
                            <div className="optimizer-lock-card-main">
                                <button
                                    type="button"
                                    className="optimizer-lock-card-toggle"
                                    onClick={() => setExpandedSlot(expanded ? null : slot.key)}
                                    aria-expanded={expanded}
                                >
                                    <span
                                        className={`equipment-slot-icon equipment-slot-icon-${slot.key}`}
                                        aria-hidden="true"
                                    />
                                    <span className="optimizer-lock-copy">
                                        <span className="optimizer-lock-label">{slot.label}</span>
                                        <strong>{item?.name || "Brak przedmiotu"}</strong>
                                    </span>
                                    {item?.tier && <small>Tier {item.tier}</small>}
                                </button>
                                {item && (
                                    <button
                                        type="button"
                                        onClick={() => onToggleSlot(slot.key)}
                                        title={slotLocked ? "Odblokuj slot" : "Zablokuj cały slot"}
                                        className="optimizer-lock-button"
                                    >
                                        <LockIcon locked={slotLocked} />
                                    </button>
                                )}
                            </div>
                            {expanded && item && (
                                <div className="optimizer-lock-drifs">
                                    {(slotData?.drifIds || []).map((drifId, index) => {
                                        const drif = drifs.find(
                                            (candidate) => String(candidate.id) === String(drifId)
                                        );
                                        const drifLocked =
                                            lockedDrifs?.[slot.key]?.includes(index) || slotLocked;
                                        return (
                                            <div
                                                key={`${slot.key}-${index}`}
                                                className={`optimizer-lock-drif ${drifLocked ? "optimizer-lock-drif-locked" : ""}`}
                                                data-category={drif?.category?.toLowerCase()}
                                            >
                                                <span>
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
                                                    >
                                                        <LockIcon locked={drifLocked} small />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {!slotData?.drifIds?.length && (
                                        <span className="optimizer-lock-empty">Brak drifów</span>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
                {visibleSlots.length === 0 && (
                    <p className="optimizer-lock-empty">Nie zablokowano jeszcze żadnego slotu.</p>
                )}
            </div>
            <footer className="optimizer-lock-summary">
                Zablokowane: <strong>{lockedSlots?.length || 0}</strong> sloty
                <span>·</span>
                <strong>{lockedDrifCount}</strong> drifów
            </footer>
        </section>
    );
};

export default OptimizerLocksColumn;
