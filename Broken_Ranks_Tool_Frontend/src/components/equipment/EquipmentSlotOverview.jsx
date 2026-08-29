/** Returns a stable list of configured modifier identifiers. */
const countConfigured = (values) => (values || []).filter(Boolean).length;

/**
 * Displays a compact, read-only summary used to select an equipment slot for editing.
 *
 * @param {object} props Component properties.
 * @param {string} props.label Slot display label.
 * @param {object|null} props.slotData Current slot request data.
 * @param {object|null} props.item Selected item template.
 * @param {boolean} props.active Whether this slot is currently edited.
 * @param {Function} props.onSelect Selects this slot for editing.
 * @returns {JSX.Element} Equipment slot summary button.
 */
const EquipmentSlotOverview = ({ label, slotData, item, active, onSelect }) => {
    const stars = item ? Math.max(1, Math.min(9, Number(slotData?.itemStars) || 1)) : 0;
    const orbCount = countConfigured(slotData?.orbIds);
    const drifCount = countConfigured(slotData?.drifIds);

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={`equipment-slot-overview ${active ? "equipment-slot-overview-active" : ""}`}
        >
            <span className="equipment-slot-overview-label">{label}</span>
            {item ? (
                <>
                    <span className="equipment-slot-overview-item">
                        {item.name}
                        {item.tier ? <small>Tier {item.tier}</small> : null}
                    </span>
                    <span className="equipment-slot-overview-meta">
                        <span aria-label={`${stars} z 9 gwiazdek`}>{"★".repeat(stars)}</span>
                        <span>
                            {orbCount} orb · {drifCount} drif
                        </span>
                    </span>
                </>
            ) : (
                <span className="equipment-slot-overview-empty">Wybierz przedmiot</span>
            )}
        </button>
    );
};

export default EquipmentSlotOverview;
