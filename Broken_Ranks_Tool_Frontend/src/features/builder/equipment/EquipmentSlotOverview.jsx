import { useDraggedResource, setDraggedResource } from "../useDraggedResource";
import { useState } from "react";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { DRIF_SIZE_LABELS } from "../../../shared/domain/equipment/drifCategories";

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
 * @param {Array<string|number>} props.acceptedItemIds Items accepted by this slot.
 * @param {Function} props.onItemDrop Applies a compatible dropped item.
 * @returns {JSX.Element} Equipment slot summary button.
 */
const EquipmentSlotOverview = ({
    slotKey,
    label,
    slotData,
    item,
    drifs = [],
    orbs = [],
    bonusTranslations = {},
    variant = "card",
    className = "",
    active,
    onSelect,
    acceptedItemIds = [],
    onItemDrop,
}) => {
    const draggedResource = useDraggedResource();
    const eligible =
        draggedResource?.dragType === "items" &&
        acceptedItemIds.some((id) => String(id) === String(draggedResource.id));
    const [dropTarget, setDropTarget] = useState(false);
    const stars = item ? Math.max(1, Math.min(9, Number(slotData?.itemStars) || 1)) : 0;
    const configuredOrbs = (slotData?.orbIds || []).flatMap((id, index) => {
        if (!id) return [];
        const orb = orbs.find((candidate) => String(candidate.id) === String(id));
        if (!orb) return [];
        return [
            {
                ...orb,
                displayName:
                    orb.name ||
                    orb.description ||
                    bonusTranslations[orb.bonusType] ||
                    orb.bonusType,
                level: slotData?.orbLevels?.[index] || 1,
            },
        ];
    });
    const configuredDrifs = getConfiguredDrifs(slotData, drifs, bonusTranslations);
    const handleDragOver = (event) => {
        if (draggedResource && !eligible) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDropTarget(true);
    };
    const handleDrop = (event) => {
        event.preventDefault();
        setDropTarget(false);
        setDraggedResource(null);
        try {
            const droppedItem = JSON.parse(event.dataTransfer.getData("application/json"));
            const accepted = acceptedItemIds.some((id) => String(id) === String(droppedItem.id));
            if (droppedItem.dragType !== "items" || !accepted) return;
            onSelect?.();
            onItemDrop?.(droppedItem);
        } catch {
            // Ignore malformed or unrelated drag payloads.
        }
    };

    return (
        <button
            type="button"
            onClick={onSelect}
            onDragOver={handleDragOver}
            onDragLeave={() => setDropTarget(false)}
            onDrop={handleDrop}
            aria-pressed={active}
            className={`${eligible ? "equipment-drop-eligible" : ""} equipment-slot-overview equipment-slot-overview-${variant} ${className} ${active ? "equipment-slot-overview-active" : ""} ${dropTarget ? "equipment-slot-overview-drop-target" : ""}`}
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
                            {configuredOrbs.length ? (
                                <span
                                    className="equipment-slot-orb-list"
                                    aria-label="Umieszczone orby"
                                >
                                    {configuredOrbs.map((orb, index) => (
                                        <span
                                            key={`${orb.id}-${index}`}
                                            className="equipment-slot-orb"
                                            title={`${orb.displayName} · ${orb.size || "orb"} · poz. ${orb.level}`}
                                            aria-label={`${orb.displayName}, ${orb.size || "orb"}, poziom ${orb.level}`}
                                        >
                                            <CategoryIcon
                                                kind="orb"
                                                category={orb.category}
                                                className="equipment-slot-orb-icon"
                                                fallback={<span aria-hidden="true">◇</span>}
                                            />
                                            <span>{orb.displayName}</span>
                                            <small>{orb.level}</small>
                                        </span>
                                    ))}
                                </span>
                            ) : null}
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
                                            <CategoryIcon
                                                kind="drif"
                                                category={drif.category}
                                                className="equipment-slot-drif-category-icon"
                                            />
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
