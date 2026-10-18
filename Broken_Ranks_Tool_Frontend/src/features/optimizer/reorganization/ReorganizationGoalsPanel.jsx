import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useEquipment } from "../../../shared/state/EquipmentContext";
import { useOptimizerLabelContext } from "../optimizerLabelContext";
import {
    normalizeReorganization,
    reorganizationStones,
    upgradeSelection,
    upgradeRows,
    reservationItems,
    LEVEL_LIMITS,
} from "./reorganizationConfiguration";
import "./reorganization.css";

const TASKS = [
    ["UPGRADE", "Ulepsz drify"],
    ["INSERT", "Wstaw drif"],
    ["RESERVE", "Zwolnij miejsce"],
];

export default function ReorganizationGoalsPanel({ settings, onChange, disabled = false, result }) {
    const { t } = useTranslation();
    const { getName } = useOptimizerLabelContext();
    const {
        requestData,
        data,
        lockedSlots = [],
        lockedDrifs = {},
        backpack = [],
        gameRules,
    } = useEquipment();
    const completed = Boolean(
        result?.applied &&
        result.reorganizationOptions &&
        result.reorganizationOptions.task !== "ARRANGE"
    );
    const options = normalizeReorganization(settings.reorganization);
    const stones = reorganizationStones({
        slots: requestData.slots,
        data,
        lockedSlots,
        lockedDrifs,
    });
    const rows = upgradeRows(options).map((row, index) => {
        const requested =
            result?.reorganizationOptions?.upgrades?.[index] ||
            result?.reorganizationOptions?.upgrade;
        if (!completed || options.task !== "UPGRADE" || !requested) return row;
        const destination = result.reorganizationDrifUsages?.find(
            (usage) =>
                usage.sourceSlotKey === requested.sourceSlotKey &&
                usage.sourceDrifIndex === requested.sourceDrifIndex
        );
        return destination
            ? {
                  ...row,
                  source: `${destination.slotKey}:${destination.drifIndex}`,
                  targetTemplateId: requested.targetTemplateId,
                  targetLevel:
                      requestData.slots[destination.slotKey]?.drifLevels?.[destination.drifIndex] ??
                      requested.targetLevel,
              }
            : row;
    });
    const update = (patch) =>
        onChange({ ...settings, reorganization: { ...options, upgrades: rows, ...patch } });
    const updateRow = (index, patch) =>
        update({ upgrades: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
    const itemChoices = reservationItems({ slots: requestData.slots, data });
    const reserved =
        itemChoices.find((item) => item.slotKey === options.reservation.slotKey) || itemChoices[0];
    const loose = backpack.filter((entry) => entry.kind === "DRIF");
    const name = (key) => getName(key, gameRules?.bonusTranslations?.[key] || key);
    const updateProtection = (key, patch) =>
        update({
            protectedModifiers: {
                ...options.protectedModifiers,
                [key]: { enabled: true, loss: 0, ...options.protectedModifiers[key], ...patch },
            },
        });
    return (
        <fieldset className="reorganization-goals custom-scrollbar" disabled={disabled}>
            <legend className="sr-only">{t("Reorganizacja drifów")}</legend>
            <div
                className="reorganization-tasks"
                role="group"
                aria-label={t("Zadanie reorganizacji")}
            >
                {TASKS.map(([task, label]) => (
                    <button
                        key={task}
                        type="button"
                        aria-pressed={options.task === task}
                        onClick={() => update({ task })}
                    >
                        {t(label)}
                    </button>
                ))}
            </div>
            {completed && (
                <p role="status" className="reorganization-completed">
                    {t("Zastosowano. Wybierz kolejne zadanie lub kamienie.")}
                </p>
            )}
            {options.task === "UPGRADE" && (
                <div className="reorganization-upgrades">
                    {rows.map((row, index) => {
                        const selection = upgradeSelection(row, stones, data.drifs);
                        if (completed && !selection.target) {
                            selection.target = data.drifs.find(
                                (drif) => String(drif.id) === String(row.targetTemplateId)
                            );
                            if (selection.target) selection.targets.push(selection.target);
                        }
                        const otherKeys = new Set(
                            rows.filter((_, i) => i !== index).map((other) => other.source)
                        );
                        return (
                            <section
                                className="reorganization-stone"
                                key={index}
                                aria-label={t("Ulepszenie {0}", [index + 1])}
                            >
                                <div className="reorganization-stone-heading">
                                    <span>{t("Drif {0}", [index + 1])}</span>
                                    {rows.length > 1 && (
                                        <button
                                            type="button"
                                            className="reorganization-remove"
                                            aria-label={t("Usuń ulepszenie {0}", [index + 1])}
                                            onClick={() =>
                                                update({
                                                    upgrades: rows.filter((_, i) => i !== index),
                                                })
                                            }
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                                <label>
                                    {t("Kamień do ulepszenia")}
                                    <select
                                        value={selection.source?.key || ""}
                                        onChange={(event) =>
                                            updateRow(index, {
                                                source: event.target.value,
                                                targetTemplateId: "",
                                                targetLevel: null,
                                            })
                                        }
                                    >
                                        <option value="" disabled>
                                            {t("Wybierz drif")}
                                        </option>
                                        {stones
                                            .filter(
                                                (stone) =>
                                                    stone.movable && !otherKeys.has(stone.key)
                                            )
                                            .map((stone) => (
                                                <option key={stone.key} value={stone.key}>
                                                    {t(
                                                        `${stone.drif.name} · ${stone.level} lvl · ${stone.slotLabel}, gniazdo ${stone.index + 1}`
                                                    )}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                <div className="reorganization-target-fields">
                                    <label>
                                        {t("Docelowy kamień")}
                                        <select
                                            value={selection.target?.id || ""}
                                            onChange={(event) =>
                                                updateRow(index, {
                                                    targetTemplateId: event.target.value,
                                                    targetLevel: null,
                                                })
                                            }
                                        >
                                            <option value="" disabled>
                                                {t("Wybierz rozmiar")}
                                            </option>
                                            {selection.targets.map((drif) => (
                                                <option key={drif.id} value={drif.id}>
                                                    {t(drif.name)} ({drif.size})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        {t("Docelowy poziom")}
                                        <input
                                            type="number"
                                            min={selection.source?.level || 1}
                                            max={LEVEL_LIMITS[selection.target?.size] || 21}
                                            value={selection.level ?? ""}
                                            disabled={row.maximizeLevel}
                                            onChange={(event) =>
                                                updateRow(index, {
                                                    targetLevel: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                {rows.length === 1 && (
                                    <label className="reorganization-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={row.maximizeLevel === true}
                                            onChange={(event) =>
                                                updateRow(index, {
                                                    maximizeLevel: event.target.checked,
                                                    targetLevel: null,
                                                })
                                            }
                                        />
                                        {t("Szukaj najwyższego poziomu")}
                                    </label>
                                )}
                            </section>
                        );
                    })}
                    <button
                        className="reorganization-add"
                        type="button"
                        disabled={
                            completed ||
                            rows.length >= stones.filter((stone) => stone.movable).length ||
                            rows.some((row) => row.maximizeLevel)
                        }
                        onClick={() => {
                            const used = new Set(
                                rows.map(
                                    (row) => upgradeSelection(row, stones, data.drifs).source?.key
                                )
                            );
                            const next = stones.find(
                                (stone) => stone.movable && !used.has(stone.key)
                            );
                            if (next)
                                update({
                                    upgrades: [
                                        ...rows.map((row) => ({
                                            ...row,
                                            source:
                                                upgradeSelection(row, stones, data.drifs).source
                                                    ?.key || row.source,
                                        })),
                                        {
                                            source: next.key,
                                            targetTemplateId: "",
                                            targetLevel: null,
                                            maximizeLevel: false,
                                        },
                                    ],
                                });
                        }}
                    >
                        {t("+ Dodaj ulepszenie")}
                    </button>
                </div>
            )}
            {options.task === "INSERT" && (
                <label>
                    {t("Drif z plecaka")}
                    <select
                        value={options.insertEntryId}
                        onChange={(event) => update({ insertEntryId: event.target.value })}
                    >
                        <option value="" disabled>
                            {t("Wybierz drif")}
                        </option>
                        {loose.map((entry, index) => {
                            const drif = data.drifs.find(
                                (drif) => String(drif.id) === String(entry.templateId)
                            );
                            return (
                                <option key={entry.id} value={entry.id}>
                                    {drif?.name || entry.templateId} · {entry.level} lvl · #
                                    {index + 1}
                                </option>
                            );
                        })}
                    </select>
                    {!loose.length && (
                        <span className="reorganization-empty">
                            {t("Brak osobnych drifów w plecaku.")}
                        </span>
                    )}
                </label>
            )}
            {options.task === "RESERVE" && (
                <div className="reorganization-stone">
                    <label>
                        {t("Przedmiot")}
                        <select
                            value={reserved?.slotKey || ""}
                            onChange={(event) =>
                                update({
                                    reservation: {
                                        ...options.reservation,
                                        slotKey: event.target.value,
                                    },
                                })
                            }
                        >
                            <option value="" disabled>
                                {t("Wybierz przedmiot")}
                            </option>
                            {itemChoices.map((item) => (
                                <option key={item.slotKey} value={item.slotKey}>
                                    {t(item.label)} · {item.item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="reorganization-target-fields">
                        <label>
                            {t("Wolne gniazda")}
                            <input
                                type="number"
                                min="0"
                                max={reserved?.sockets || 3}
                                value={options.reservation.freeSockets}
                                onChange={(event) =>
                                    update({
                                        reservation: {
                                            ...options.reservation,
                                            freeSockets: event.target.value,
                                        },
                                    })
                                }
                            />
                        </label>
                        <label>
                            {t("Wolna pojemność")}
                            <input
                                type="number"
                                min="0"
                                max={reserved?.capacity || 0}
                                value={options.reservation.freeCapacity}
                                onChange={(event) =>
                                    update({
                                        reservation: {
                                            ...options.reservation,
                                            freeCapacity: event.target.value,
                                        },
                                    })
                                }
                            />
                        </label>
                    </div>
                </div>
            )}
            <details className="reorganization-advanced">
                <summary>{t("Ustawienia zaawansowane")}</summary>
                <label
                    className="reorganization-move-limit"
                    title={t(
                        "Zamiana dwóch kamieni liczy się jako 2 przełożenia; wstawienie lub odłożenie kamienia jako 1."
                    )}
                >
                    {t("Maksymalna liczba przełożeń")}
                    <input
                        type="number"
                        min="1"
                        max="50"
                        step="1"
                        value={options.maxMoves}
                        onChange={(event) => update({ maxMoves: event.target.value })}
                    />
                </label>
                <label className="reorganization-checkbox">
                    <input
                        type="checkbox"
                        checked={options.allowUnequip}
                        onChange={(event) => update({ allowUnequip: event.target.checked })}
                    />
                    {t("Pozwól odkładać założone drify do plecaka")}
                </label>
                <table className="reorganization-protections">
                    <thead>
                        <tr>
                            <th scope="col">{t("Chroń mod")}</th>
                            <th scope="col">{t("Dopuszczalny spadek (p.p.)")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...new Set(stones.map((stone) => stone.drif.bonusType))].map((key) => {
                            const rule = options.protectedModifiers[key] || {
                                enabled: true,
                                loss: 0,
                            };
                            return (
                                <tr key={key}>
                                    <th scope="row">
                                        <label className="reorganization-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={rule.enabled !== false}
                                                onChange={(event) =>
                                                    updateProtection(key, {
                                                        enabled: event.target.checked,
                                                    })
                                                }
                                            />
                                            {t(name(key))}
                                        </label>
                                    </th>
                                    <td>
                                        <input
                                            aria-label={t("Dopuszczalny spadek dla: {0}", [
                                                t(name(key)),
                                            ])}
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={rule.loss}
                                            disabled={rule.enabled === false}
                                            onChange={(event) =>
                                                updateProtection(key, { loss: event.target.value })
                                            }
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </details>
        </fieldset>
    );
}
