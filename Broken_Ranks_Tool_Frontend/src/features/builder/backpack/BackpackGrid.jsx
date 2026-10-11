import { useMemo } from "react";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import { setDraggedResource } from "../useDraggedResource";
import { backpackSlot, backpackTemplate, backpackWarning } from "./backpackDomain";

const ENTRY_MIME = "application/x-broken-ranks-backpack-entry";
const labels = { ITEM: "Przedmiot", ORB: "Orb", DRIF: "Drif" };

const BackpackCard = ({ entry, entries, index, data, gameRules, model }) => {
    const template = backpackTemplate(entry, data);
    const slot = backpackSlot(template);
    const warning = useMemo(
        () => backpackWarning(entry, data, gameRules),
        [entry, data, gameRules]
    );
    const name = template?.name || "Nieznany obiekt";
    const active = model.activeEntry?.id === entry.id;
    return (
        <article
            className={`backpack-card ${active ? "is-selected" : ""} ${warning ? "is-invalid" : ""}`}
            draggable
            onDragStart={(event) => {
                event.dataTransfer.setData(ENTRY_MIME, entry.id);
                event.dataTransfer.effectAllowed = "move";
                setDraggedResource(null);
            }}
            onDragOver={(event) => {
                if ([...event.dataTransfer.types].includes(ENTRY_MIME)) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.dataTransfer.dropEffect = "move";
                }
            }}
            onDrop={(event) => {
                const id = event.dataTransfer.getData(ENTRY_MIME);
                if (id) {
                    event.preventDefault();
                    event.stopPropagation();
                    model.move(id, entry.id);
                }
            }}
        >
            {entry.kind === "ITEM" ? (
                <EquipmentSlotOverview
                    slotKey={slot?.key}
                    label="Przedmiot"
                    item={template}
                    slotData={entry.equipment}
                    drifs={data.drifs}
                    orbs={data.orbs}
                    bonusTranslations={gameRules.bonusTranslations}
                    active={active}
                    onSelect={() => model.select(entry.id)}
                />
            ) : (
                <button
                    type="button"
                    className="backpack-stone-card"
                    aria-label={`${labels[entry.kind]} ${name}, ${template?.size || "kamień"}, poziom ${entry.level}`}
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
                        <small>{labels[entry.kind]}</small>
                        <strong>{name}</strong>
                        <span>
                            {template?.size} · poz. {entry.level}
                        </span>
                    </span>
                </button>
            )}
            {warning && <p className="backpack-card-warning">Wymaga poprawy</p>}
            <div className="backpack-card-actions">
                <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Przesuń wcześniej: ${name}`}
                    onClick={() => model.move(entry.id, entries[index - 1].id)}
                >
                    ←
                </button>
                <button
                    type="button"
                    disabled={index === entries.length - 1}
                    aria-label={`Przesuń później: ${name}`}
                    onClick={() => model.move(entry.id, entries[index + 1].id)}
                >
                    →
                </button>
                <button
                    type="button"
                    aria-label={`Duplikuj: ${name}`}
                    onClick={() => model.duplicate(entry)}
                >
                    Duplikuj
                </button>
                <button
                    type="button"
                    aria-label={`Usuń z plecaka: ${name}`}
                    onClick={() => model.remove(entry.id)}
                >
                    ×
                </button>
            </div>
        </article>
    );
};

/** Inventory grid accepts catalog resources; equipment slots never receive these drops. */
export default function BackpackGrid({ entries, data, gameRules, model }) {
    const drop = (event) => {
        event.preventDefault();
        try {
            const resource = JSON.parse(event.dataTransfer.getData("application/json"));
            const kind = { items: "ITEM", orbs: "ORB", drifs: "DRIF" }[resource.dragType];
            if (!kind) return;
            const template = data[resource.dragType]?.find(
                (candidate) => String(candidate.id) === String(resource.id)
            );
            if (template) model.add(kind, template);
        } catch {
            /* Ignore file and unrelated drag payloads. */
        } finally {
            setDraggedResource(null);
        }
    };
    return (
        <div
            className="backpack-workbench"
            onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={drop}
        >
            <div className="backpack-toolbar">
                {["ITEM", "ORB", "DRIF"].map((kind) => (
                    <button key={kind} type="button" onClick={() => model.begin(kind)}>
                        + Dodaj {labels[kind].toLowerCase()}
                    </button>
                ))}
                <span aria-live="polite">Obiekty: {entries.length}</span>
            </div>
            {model.notice && (
                <p className="backpack-warning" role="alert">
                    {model.notice}
                </p>
            )}
            {entries.length ? (
                <div className="backpack-grid" aria-label="Zawartość plecaka">
                    {entries.map((entry, index) => (
                        <BackpackCard
                            key={entry.id}
                            entry={entry}
                            entries={entries}
                            index={index}
                            data={data}
                            gameRules={gameRules}
                            model={model}
                        />
                    ))}
                </div>
            ) : (
                <div className="backpack-empty">
                    Dodaj obiekt przyciskiem lub przeciągnij go z katalogu.
                </div>
            )}
        </div>
    );
}
