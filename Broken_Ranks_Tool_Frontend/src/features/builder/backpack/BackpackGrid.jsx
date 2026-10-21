import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useMemo, useState } from "react";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import { setDraggedResource, useDraggedResource } from "../useDraggedResource";
import {
    backpackSlot,
    backpackTemplate,
    backpackWarning,
    MAX_BACKPACK_ENTRIES,
} from "./backpackDomain";
import { BACKPACK_FILTERS, backpackSortOptions, visibleBackpackEntries } from "./backpackView";
import { backpackDragResource } from "./backpackEquipmentTransfer";

const ENTRY_MIME = "application/x-broken-ranks-backpack-entry";
const labels = { ITEM: "Przedmiot", ORB: "Orb", DRIF: "Drif" };
const isStone = (resource) => ["drifs", "orbs"].includes(resource?.dragType);
const socketAt = (event) => event.target.closest?.("[data-stone-zone]")?.dataset.stoneZone;

const BackpackCard = ({ entry, entries, index, data, gameRules, model, manualOrder }) => {
    const { t } = useTranslation();

    const template = backpackTemplate(entry, data);
    const slot = backpackSlot(template);
    const warning = useMemo(
        () => backpackWarning(entry, data, gameRules),
        [entry, data, gameRules]
    );
    const name = template?.name || "Nieznany obiekt";
    const active = model.activeEntry?.id === entry.id;
    const draggedResource = useDraggedResource();
    const [dropZone, setDropZone] = useState(undefined);
    const stoneTarget = entry.kind === "ITEM" && isStone(draggedResource);
    const eligible =
        stoneTarget &&
        model.getStoneDropWarning &&
        !model.getStoneDropWarning(draggedResource, entry.id, dropZone);
    const canDrag = manualOrder || entry.kind !== "ITEM";
    return (
        <article
            className={`backpack-card ${active ? "is-selected" : ""} ${warning ? "is-invalid" : ""} ${eligible ? "equipment-drop-eligible" : ""}`}
            draggable={canDrag}
            onDragStart={(event) => {
                if (!canDrag) return;
                if (manualOrder) event.dataTransfer.setData(ENTRY_MIME, entry.id);
                event.dataTransfer.effectAllowed = "move";
                const resource = entry.kind !== "ITEM" ? backpackDragResource(entry, data) : null;
                if (resource)
                    event.dataTransfer.setData("application/json", JSON.stringify(resource));
                setDraggedResource(resource);
            }}
            onDragOver={(event) => {
                if (stoneTarget) {
                    event.preventDefault();
                    event.stopPropagation();
                    setDropZone(socketAt(event));
                    event.dataTransfer.dropEffect =
                        draggedResource.source === "backpack" ? "move" : "copy";
                } else if (
                    manualOrder &&
                    [...(event.dataTransfer.types || [])].includes(ENTRY_MIME)
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = "move";
                }
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropZone(undefined);
            }}
            onDrop={(event) => {
                let resource;
                try {
                    resource = JSON.parse(event.dataTransfer.getData("application/json"));
                } catch {
                    /* Internal reordering has no JSON payload. */
                }
                if (entry.kind === "ITEM" && isStone(resource) && model.placeStone) {
                    event.preventDefault();
                    event.stopPropagation();
                    model.placeStone(resource, entry.id, socketAt(event));
                    setDropZone(undefined);
                    setDraggedResource(null);
                    return;
                }
                const id = event.dataTransfer.getData(ENTRY_MIME);
                if (id && entries.some((candidate) => candidate.id === id)) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (manualOrder) model.move(id, entry.id);
                    setDraggedResource(null);
                }
            }}
        >
            {entry.kind === "ITEM" ? (
                <EquipmentSlotOverview
                    slotKey={slot?.key}
                    label={t("Przedmiot")}
                    item={template}
                    slotData={entry.equipment}
                    drifs={data.drifs}
                    orbs={data.orbs}
                    bonusTranslations={gameRules.bonusTranslations}
                    active={active}
                    draggable={manualOrder}
                    onSelect={() => model.select(entry.id)}
                />
            ) : (
                <button
                    type="button"
                    draggable={canDrag}
                    className="backpack-stone-card"
                    aria-label={t("{0} {1}, {2}, poziom {3}", [
                        t(labels[entry.kind]),
                        t(name),
                        t(template?.size || "kamień"),
                        t(entry.level),
                    ])}
                    aria-pressed={active}
                    onClick={() => model.select(entry.id)}
                >
                    <CategoryIcon
                        kind={entry.kind.toLowerCase()}
                        category={
                            template?.category ||
                            gameRules.drifBonusCategories?.[template?.bonusType]
                        }
                        fallback={<span aria-hidden="true">◇</span>}
                    />
                    <span>
                        <small>{t(labels[entry.kind])}</small>
                        <strong>{t(name)}</strong>
                        <span>
                            {t(template?.size)}
                            {t(" · poz. ")}
                            {t(entry.level)}
                        </span>
                    </span>
                </button>
            )}
            {warning && <p className="backpack-card-warning">{t("Wymaga poprawy")}</p>}
            {entry.kind === "DRIF" && (
                <label
                    className="backpack-backend-selection"
                    title={t(
                        "Udostępnij tę sztukę optymalizatorowi w trybie Użyj drifów z plecaka"
                    )}
                >
                    <input
                        type="checkbox"
                        aria-label={t("Drif do optymalizacji: {0}, {1}, poziom {2}", [
                            t(name),
                            t(template?.size || "drif"),
                            t(entry.level),
                        ])}
                        checked={entry.sendToBackend === true}
                        onChange={(event) =>
                            model.update(entry.id, { sendToBackend: event.target.checked })
                        }
                    />
                    <span>{t("Do optymalizacji")}</span>
                </label>
            )}
            <div className="backpack-card-actions">
                <button
                    type="button"
                    disabled={!manualOrder || index === 0}
                    title={t(
                        manualOrder ? undefined : "Przesuwanie dostępne przy własnej kolejności"
                    )}
                    aria-label={t("Przesuń wcześniej: {0}", [t(name)])}
                    onClick={() => model.move(entry.id, entries[index - 1].id)}
                >
                    ←
                </button>
                <button
                    type="button"
                    disabled={!manualOrder || index === entries.length - 1}
                    title={t(
                        manualOrder ? undefined : "Przesuwanie dostępne przy własnej kolejności"
                    )}
                    aria-label={t("Przesuń później: {0}", [t(name)])}
                    onClick={() => model.move(entry.id, entries[index + 1].id)}
                >
                    →
                </button>
                <button
                    type="button"
                    aria-label={t("Duplikuj: {0}", [t(name)])}
                    onClick={() => model.duplicate(entry)}
                >
                    {t("Duplikuj")}
                </button>
                <button
                    type="button"
                    aria-label={t("Usuń z plecaka: {0}", [t(name)])}
                    onClick={() => model.remove(entry.id)}
                >
                    ×
                </button>
            </div>
        </article>
    );
};

/** Catalog resources add occurrences; stones dropped on item cards configure that item. */
export default function BackpackGrid({ entries, data, gameRules, model }) {
    const { t } = useTranslation();

    const [filter, setFilter] = useState("ALL");
    const [sort, setSort] = useState("manual");
    const [direction, setDirection] = useState("asc");
    const [dropTarget, setDropTarget] = useState(false);
    const draggedResource = useDraggedResource();
    const sortOptions = useMemo(() => backpackSortOptions(filter, data), [filter, data]);
    const effectiveSort = sortOptions.some(([key]) => key === sort) ? sort : "manual";
    const visibleEntries = useMemo(
        () => visibleBackpackEntries(entries, data, gameRules, filter, effectiveSort, direction),
        [entries, data, gameRules, filter, effectiveSort, direction]
    );
    const revealKind = (kind) => {
        if (filter !== "ALL" && filter !== kind) setFilter(kind);
    };
    const drop = (event) => {
        event.preventDefault();
        setDropTarget(false);
        try {
            const resource = JSON.parse(event.dataTransfer.getData("application/json"));
            if (!resource || typeof resource !== "object") return;
            if (resource.source === "backpack") return;
            const kind = { items: "ITEM", orbs: "ORB", drifs: "DRIF" }[resource.dragType];
            if (!kind) return;
            const template = data[resource.dragType]?.find(
                (candidate) => String(candidate.id) === String(resource.id)
            );
            if (template) {
                model.add(kind, template);
                revealKind(kind);
            }
        } catch {
            /* Ignore file and unrelated drag payloads. */
        } finally {
            setDraggedResource(null);
        }
    };
    return (
        <div
            className={`backpack-workbench ${draggedResource && draggedResource.source !== "backpack" ? "backpack-drop-eligible" : ""} ${dropTarget ? "backpack-drop-target" : ""}`}
            onDragOver={(event) => {
                if (draggedResource?.source === "backpack") return;
                if ([...(event.dataTransfer.types || [])].includes(ENTRY_MIME)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDropTarget(true);
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget(false);
            }}
            onDrop={drop}
            onDragEnd={() => setDraggedResource(null)}
        >
            <div className="backpack-view-controls">
                <div className="backpack-filters" role="group" aria-label={t("Pokaż w plecaku")}>
                    {BACKPACK_FILTERS.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={filter === key}
                            onClick={() => setFilter(key)}
                        >
                            {t(label)}
                        </button>
                    ))}
                </div>
                <div className="backpack-sort-controls">
                    <label>
                        {t("Sortuj według")}
                        <select
                            value={effectiveSort}
                            onChange={(event) => setSort(event.target.value)}
                        >
                            {sortOptions.map(([key, label]) => (
                                <option key={key} value={key}>
                                    {t(label)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        disabled={effectiveSort === "manual"}
                        onClick={() => setDirection(direction === "asc" ? "desc" : "asc")}
                        aria-label={t(
                            direction === "asc"
                                ? "Kierunek sortowania: rosnąco"
                                : "Kierunek sortowania: malejąco"
                        )}
                    >
                        {t(direction === "asc" ? "↑ Rosnąco" : "↓ Malejąco")}
                    </button>
                </div>
            </div>
            <div className="backpack-toolbar">
                {["ITEM", "ORB", "DRIF"].map((kind) => (
                    <button
                        key={kind}
                        type="button"
                        onClick={() => {
                            revealKind(kind);
                            model.begin(kind);
                        }}
                    >
                        {t("+ Dodaj ")}
                        {t(labels[kind].toLowerCase())}
                    </button>
                ))}
                <span aria-live="polite">
                    {t("Sloty: ")}
                    {t(entries.length)}/{t(MAX_BACKPACK_ENTRIES)}
                    {t(
                        visibleEntries.length !== entries.length &&
                            ` · Widoczne: ${visibleEntries.length}`
                    )}
                </span>
            </div>
            {model.notice && (
                <p className="backpack-warning" role="alert">
                    {t(model.notice)}
                </p>
            )}
            {visibleEntries.length ? (
                <div className="backpack-grid" aria-label={t("Zawartość plecaka")}>
                    {visibleEntries.map((entry, index) => (
                        <BackpackCard
                            key={entry.id}
                            entry={entry}
                            entries={visibleEntries}
                            index={index}
                            data={data}
                            gameRules={gameRules}
                            model={model}
                            manualOrder={effectiveSort === "manual"}
                        />
                    ))}
                </div>
            ) : (
                <div className="backpack-empty">
                    {t(
                        entries.length
                            ? "Brak obiektów tego rodzaju w plecaku."
                            : "Dodaj obiekt przyciskiem lub przeciągnij go z bazy danych."
                    )}
                </div>
            )}
        </div>
    );
}
