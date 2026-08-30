const DRIF_SIZE_LABELS = {
    SUBDRIF: "S",
    BIDRIF: "B",
    MAGNIDRIF: "M",
    ARCYDRIF: "A",
};

const getConfiguredDrifs = (slotData, drifs, bonusTranslations) =>
    (slotData?.drifIds || []).flatMap((id, index) => {
        if (!id) return [];
        const drif = drifs.find((candidate) => String(candidate.id) === String(id));
        if (!drif) return [];
        return [
            {
                ...drif,
                displayName:
                    drif.name ||
                    drif.description ||
                    bonusTranslations?.[drif.bonusType] ||
                    drif.bonusType,
                level: slotData?.drifLevels?.[index],
            },
        ];
    });

/**
 * Displays a compact, read-only summary used to select an equipment slot for editing.
 *
 * @param {object} props Component properties.
 * @param {string} props.slotKey Equipment slot identifier.
 * @param {string} props.label Slot display label.
 * @param {object|null} props.slotData Current slot request data.
 * @param {object|null} props.item Selected item template.
 * @param {boolean} props.active Whether this slot is currently edited.
 * @param {Function} props.onSelect Selects this slot for editing.
 * @returns {JSX.Element} Equipment slot summary button.
 */
const EquipmentSlotOverview = ({
    slotKey,
    label,
    slotData,
    item,
    drifs = [],
    bonusTranslations = {},
    active,
    onSelect,
}) => {
    const stars = item ? Math.max(1, Math.min(9, Number(slotData?.itemStars) || 1)) : 0;
    const configuredDrifs = getConfiguredDrifs(slotData, drifs, bonusTranslations);

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={`equipment-slot-overview ${active ? "equipment-slot-overview-active" : ""}`}
        >
            <span
                className={`equipment-slot-icon${slotKey ? ` equipment-slot-icon-${slotKey}` : ""}`}
                aria-hidden="true"
            />
            <span className="equipment-slot-overview-content">
                <span className="equipment-slot-overview-heading">
                    <span className="equipment-slot-overview-label">{label}</span>
                    {item?.tier ? <small>Tier {item.tier}</small> : null}
                </span>
                {item ? (
                    <>
                        <span className="equipment-slot-overview-item">{item.name}</span>
                        <span className="equipment-slot-overview-meta">
                            <span aria-label={`${stars} z 9 gwiazdek`}>{"★".repeat(stars)}</span>
                        </span>
                        {configuredDrifs.length ? (
                            <span
                                className="equipment-slot-drif-list"
                                aria-label="Umieszczone drify"
                            >
                                {configuredDrifs.map((drif, index) => {
                                    const size = DRIF_SIZE_LABELS[drif.size?.toUpperCase()] || "D";
                                    const level = drif.level ? ` · poz. ${drif.level}` : "";
                                    return (
                                        <span
                                            key={`${drif.id}-${index}`}
                                            className="equipment-slot-drif"
                                            data-category={drif.category?.toLowerCase()}
                                            title={`${drif.displayName} · ${drif.size || "drif"}${level}`}
                                        >
                                            <i aria-hidden="true">{size}</i>
                                            <span>{drif.displayName}</span>
                                            {drif.level ? <small>{drif.level}</small> : null}
                                        </span>
                                    );
                                })}
                            </span>
                        ) : null}
                    </>
                ) : (
                    <span className="equipment-slot-overview-empty">Wybierz przedmiot</span>
                )}
            </span>
        </button>
    );
};

export default EquipmentSlotOverview;
