import { useMemo, useState } from "react";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { setDraggedResource } from "../useDraggedResource";
import { backpackSlot, backpackTemplate } from "./backpackDomain";
import { backpackDragResource } from "./backpackEquipmentTransfer";
import { BACKPACK_FILTERS, backpackEntryLabel, visibleBackpackEntries } from "./backpackView";
import "./backpack-source.css";

export default function BackpackSourcePanel({
    entries,
    data,
    gameRules,
    activeSlot,
    onEquip,
    getWarning,
}) {
    const [filter, setFilter] = useState("ALL");
    const [query, setQuery] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [zone, setZone] = useState("item");
    const filtered = useMemo(
        () =>
            visibleBackpackEntries(entries, data, gameRules, filter, "name", "asc").filter(
                (entry) =>
                    backpackEntryLabel(entry, data)
                        .toLocaleLowerCase("pl")
                        .includes(query.toLocaleLowerCase("pl"))
            ),
        [entries, data, gameRules, filter, query]
    );
    return (
        <section
            className="backpack-source-panel"
            aria-label="Plecak do wyposażenia"
            onDragEnd={() => setDraggedResource(null)}
        >
            <div
                className="backpack-filters"
                role="group"
                aria-label="Rodzaj rzeczy do wyposażenia"
            >
                {BACKPACK_FILTERS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={filter === key}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <label className="backpack-source-search">
                Szukaj w plecaku
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </label>
            <div className="backpack-source-results">
                {filtered.map((entry) => {
                    const template = backpackTemplate(entry, data);
                    const resource = backpackDragResource(entry, data);
                    const active = selectedId === entry.id;
                    const select = () => {
                        setSelectedId(entry.id);
                        setZone(
                            entry.kind === "ITEM"
                                ? "item"
                                : entry.kind === "ORB"
                                  ? "orb1"
                                  : "drif-0"
                        );
                    };
                    const target = entry.kind === "ITEM" ? "item" : zone;
                    const warning = active ? getWarning(entry.id, activeSlot.key, target) : null;
                    return (
                        <article
                            key={entry.id}
                            className={`backpack-card backpack-source-card ${active ? "is-selected" : ""}`}
                            draggable={Boolean(resource)}
                            onDragStart={(event) => {
                                if (!resource) return;
                                event.dataTransfer.setData(
                                    "application/json",
                                    JSON.stringify(resource)
                                );
                                event.dataTransfer.effectAllowed = "move";
                                setDraggedResource(resource);
                            }}
                        >
                            {entry.kind === "ITEM" ? (
                                <EquipmentSlotOverview
                                    slotKey={backpackSlot(template)?.key}
                                    label="Przedmiot"
                                    item={template}
                                    slotData={entry.equipment}
                                    drifs={data.drifs}
                                    orbs={data.orbs}
                                    bonusTranslations={gameRules.bonusTranslations}
                                    active={active}
                                    onSelect={select}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="backpack-source-stone"
                                    onClick={select}
                                    aria-pressed={active}
                                >
                                    <CategoryIcon
                                        kind={entry.kind.toLowerCase()}
                                        category={template?.category}
                                    />
                                    <span>{backpackEntryLabel(entry, data)}</span>
                                </button>
                            )}
                            {active && (
                                <div className="backpack-source-action">
                                    {entry.kind !== "ITEM" && (
                                        <label>
                                            Gniazdo w slocie {activeSlot.label}
                                            <select
                                                value={zone}
                                                onChange={(event) => setZone(event.target.value)}
                                            >
                                                {(entry.kind === "ORB"
                                                    ? ["orb1", "orb2"]
                                                    : ["drif-0", "drif-1", "drif-2"]
                                                ).map((key, index) => (
                                                    <option key={key} value={key}>
                                                        {entry.kind === "ORB" ? "Orb" : "Drif"}{" "}
                                                        {index + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {warning && (
                                        <p className="backpack-warning" role="status">
                                            {warning}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        disabled={Boolean(warning)}
                                        onClick={() => onEquip(entry.id, activeSlot.key, target)}
                                    >
                                        Załóż w slocie {activeSlot.label}
                                    </button>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
            {!filtered.length && (
                <p className="backpack-editor-empty">Brak pasujących rzeczy w plecaku.</p>
            )}
        </section>
    );
}
