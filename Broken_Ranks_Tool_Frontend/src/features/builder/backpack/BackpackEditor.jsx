import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useCallback, useMemo, useState } from "react";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { getDrifMaxLevel, getOrbMaxLevel } from "../../../shared/domain/equipment/equipmentRules";
import GearSlot from "../gear-slot/GearSlot";
import { groupGearOptionsByType } from "../gear-slot/gearSlotDomain";
import {
    backpackSlot,
    backpackTemplate,
    backpackWarning,
    createBackpackEntry,
} from "./backpackDomain";

function ItemPicker({ data, onSelect }) {
    const { t } = useTranslation();

    const [category, setCategory] = useState("helmet");
    const slot = SLOTS.find((slot) => slot.key === category);
    const allowed = Array.isArray(slot.cat) ? slot.cat : [slot.cat];
    return (
        <div className="backpack-picker">
            <label>
                {t("Kategoria")}
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {SLOTS.filter((slot) => slot.key !== "ring2").map((slot) => (
                        <option key={slot.key} value={slot.key}>
                            {t(slot.label)}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                {t("Przedmiot do plecaka")}
                <select
                    value=""
                    onChange={(event) =>
                        onSelect(data.items.find((item) => String(item.id) === event.target.value))
                    }
                >
                    <option value="">{t("Wybierz przedmiot")}</option>
                    {data.items
                        .filter((item) => allowed.includes(item.category))
                        .map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name} · {t(item.tier)}
                            </option>
                        ))}
                </select>
            </label>
        </div>
    );
}

function StoneEditor({ kind, entry, data, onCreate, onUpdate }) {
    const { t } = useTranslation();

    const stones = kind === "ORB" ? data.orbs : data.drifs;
    const groups = useMemo(() => groupGearOptionsByType(stones), [stones]);
    const template = entry && backpackTemplate(entry, data);
    const [pendingType, setPendingType] = useState("");
    const type = template?.name || template?.description || template?.bonusType || pendingType;
    const options = groups[type] || [];
    const choose = (id) => {
        const stone = stones.find((candidate) => String(candidate.id) === id);
        if (entry)
            onUpdate({
                templateId: id,
                level: Math.min(
                    entry.level,
                    kind === "ORB" ? getOrbMaxLevel(stone.size) : getDrifMaxLevel(stone.size)
                ),
            });
        else onCreate(stone);
    };
    const maximum = template
        ? kind === "ORB"
            ? getOrbMaxLevel(template.size)
            : getDrifMaxLevel(template.size)
        : 1;
    return (
        <div className="backpack-picker">
            <label>
                {t("Rodzaj ")}
                {t(kind === "ORB" ? "orba" : "drifa")}
                <select
                    value={type}
                    onChange={(event) => {
                        setPendingType(event.target.value);
                        if (entry) choose(String(groups[event.target.value][0].id));
                    }}
                >
                    <option value="" disabled>
                        {t("Wybierz rodzaj")}
                    </option>
                    {Object.keys(groups)
                        .sort((a, b) => a.localeCompare(b, "pl"))
                        .map((name) => (
                            <option key={name} value={name}>
                                {t(name)}
                            </option>
                        ))}
                </select>
            </label>
            <label>
                {t("Rozmiar")}
                <select
                    value={entry?.templateId || ""}
                    disabled={!type}
                    onChange={(event) => choose(event.target.value)}
                >
                    <option value="" disabled>
                        {t("Wybierz rozmiar")}
                    </option>
                    {options.map((stone) => (
                        <option key={stone.id} value={stone.id}>
                            {t(stone.size)}
                        </option>
                    ))}
                </select>
            </label>
            {entry && (
                <label>
                    {t("Poziom")}
                    <select
                        value={entry.level}
                        aria-label={t("Poziom")}
                        onChange={(event) => onUpdate({ level: Number(event.target.value) })}
                    >
                        {Array.from(
                            { length: Math.max(maximum, entry.level) },
                            (_, index) => index + 1
                        ).map((level) => (
                            <option key={level} value={level} disabled={level > maximum}>
                                {t(level)}
                            </option>
                        ))}
                    </select>
                </label>
            )}
        </div>
    );
}

/** Selected backpack objects reuse the domain equipment editor in an isolated one-item context. */
export default function BackpackEditor({ model, data, gameRules, syncTrigger }) {
    const { t } = useTranslation();

    const entry = model.activeEntry;
    const template = entry && backpackTemplate(entry, data);
    const slot = entry?.kind === "ITEM" ? backpackSlot(template) : null;
    const items = useMemo(
        () =>
            slot
                ? data.items.filter((item) =>
                      (Array.isArray(slot.cat) ? slot.cat : [slot.cat]).includes(item.category)
                  )
                : [],
        [data.items, slot]
    );
    const allSlots = useMemo(
        () => (slot && entry ? { [slot.key]: entry.equipment } : {}),
        [slot, entry]
    );
    const entryId = entry?.id;
    const { removeStone, undoStoneRemoval, getStoneRemovalWarning, getStoneRemovalUndoWarning } =
        model;
    const equipmentRemoval = useMemo(
        () => ({
            getKey: (_kind, _slotKey, zone) => `${entryId}:${zone}`,
            removeEquipment: (kind, _slotKey, zone) => removeStone(kind, entryId, zone),
            undoRemoval: undoStoneRemoval,
            getRemovalWarning: (kind, _slotKey, zone) =>
                getStoneRemovalWarning(kind, entryId, zone),
            getUndoWarning: getStoneRemovalUndoWarning,
        }),
        [entryId, removeStone, undoStoneRemoval, getStoneRemovalWarning, getStoneRemovalUndoWarning]
    );
    const placeStone = model.placeStone;
    const getStoneDropWarning = model.getStoneDropWarning;
    const onStoneDrop = useCallback(
        (resource, zone) => placeStone(resource, entryId, zone),
        [placeStone, entryId]
    );
    const stoneDropWarning = useCallback(
        (resource, zone) => getStoneDropWarning(resource, entryId, zone),
        [getStoneDropWarning, entryId]
    );
    const onBackpackEquip = useCallback(
        (sourceId, _slotKey, zone) =>
            placeStone({ source: "backpack", entryId: sourceId }, entryId, zone),
        [placeStone, entryId]
    );
    const getBackpackEquipWarning = useCallback(
        (sourceId, _slotKey, zone) =>
            getStoneDropWarning({ source: "backpack", entryId: sourceId }, entryId, zone),
        [getStoneDropWarning, entryId]
    );
    const updateEntry = model.update;
    const updateEquipment = useCallback(
        (_slotKey, equipment) => updateEntry(entryId, { equipment }),
        [updateEntry, entryId]
    );
    const kind = model.creatingKind || entry?.kind;
    const warning = entry && backpackWarning(entry, data, gameRules);
    return (
        <section className="selected-slot-editor backpack-editor" aria-label={t("Edytor plecaka")}>
            <div className="selected-slot-editor-heading">
                <p className="section-kicker">{t("Plecak")}</p>
                <h3>{model.creatingKind ? "Nowy obiekt" : template?.name || "Wybierz obiekt"}</h3>
            </div>
            <div className="selected-slot-editor-content">
                {warning && (
                    <p role="status" className="backpack-warning">
                        {t(warning)}
                    </p>
                )}
                {model.creatingKind === "ITEM" ? (
                    <ItemPicker data={data} onSelect={(item) => model.add("ITEM", item)} />
                ) : kind === "DRIF" || kind === "ORB" ? (
                    <StoneEditor
                        key={`${kind}:${entry?.id || "new"}`}
                        kind={kind}
                        entry={entry}
                        data={data}
                        onCreate={(stone) => model.add(kind, stone)}
                        onUpdate={(change) => model.update(entry.id, change)}
                    />
                ) : entry && slot ? (
                    <GearSlot
                        key={entry.id}
                        expanded
                        allowEmptyItem={false}
                        slotKey={slot.key}
                        label={t("Przedmiot w plecaku")}
                        items={items}
                        drifs={data.drifs}
                        orbs={data.orbs}
                        allSlots={allSlots}
                        gameRules={gameRules}
                        onUpdate={updateEquipment}
                        optimizationTrigger={`${syncTrigger ?? ""}:${model.editRevision}`}
                        onBackpackEquip={onBackpackEquip}
                        getBackpackEquipWarning={getBackpackEquipWarning}
                        onStoneDrop={onStoneDrop}
                        getStoneDropWarning={stoneDropWarning}
                        equipmentRemoval={equipmentRemoval}
                    />
                ) : entry?.kind === "ITEM" ? (
                    <ItemPicker
                        data={data}
                        onSelect={(item) =>
                            model.update(entry.id, {
                                equipment: createBackpackEntry("ITEM", item, data, gameRules)
                                    .equipment,
                            })
                        }
                    />
                ) : (
                    <p className="backpack-editor-empty">{t("Wybierz obiekt lub dodaj nowy.")}</p>
                )}
            </div>
        </section>
    );
}
