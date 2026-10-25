import { useMemo, useState } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { downloadBuildText } from "../builds/buildDownloads";
import {
    progressionShoppingTasks,
    shoppingTaskLevel,
    groupShoppingTasks,
    shoppingTaskLabel,
    shoppingListText,
} from "./progressionShopping";
import "./progression-shopping.css";

export default function ProgressionShoppingList({
    groups,
    data,
    completed,
    playerLevel,
    prepared,
    onPreparedChange,
}) {
    const { t } = useTranslation();
    const [scope, setScope] = useState("all");
    const tasks = useMemo(() => progressionShoppingTasks(groups), [groups]);
    const pending = groups.filter(
        (group) => group.level >= playerLevel && !completed.has(group.level)
    );
    const levels = new Set(
        (scope === "next"
            ? pending.slice(0, 3)
            : groups.filter((group) => !completed.has(group.level))
        ).map((group) => group.level)
    );
    const entries = groupShoppingTasks(tasks.filter((task) => levels.has(shoppingTaskLevel(task))));
    const categories = [
        ["items", "Przedmioty"],
        ["stones", "Kamienie"],
        ["upgrades", "Ulepszenia"],
    ];
    return (
        <details className="progression-shopping">
            <summary>{t("Zakupy i ulepszenia ścieżki")}</summary>
            <div className="progression-shopping-controls">
                <label>
                    {t("Zakres listy")}
                    <select value={scope} onChange={(event) => setScope(event.target.value)}>
                        <option value="all">{t("Wszystkie niewykonane etapy")}</option>
                        <option value="next">{t("Najbliższe 3 etapy od Twojego poziomu")}</option>
                    </select>
                </label>
                <button
                    type="button"
                    disabled={!entries.length}
                    onClick={() =>
                        downloadBuildText(
                            shoppingListText(entries, prepared, data, t),
                            "broken-ranks-shopping.txt",
                            "text/plain;charset=utf-8"
                        )
                    }
                >
                    {t("Pobierz listę TXT")}
                </button>
            </div>
            <p>{t("Oznaczenie przygotowania nie oznacza wykonania etapu.")}</p>
            {!entries.length && <p>{t("Brak zakupów i ulepszeń w wybranym zakresie.")}</p>}
            {categories.map(([category, label]) => {
                const rows = entries.filter((entry) => entry.category === category);
                return rows.length ? (
                    <section key={category}>
                        <h3>{t(label)}</h3>
                        <ul>
                            {rows.map((entry) => (
                                <li key={entry.id}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={entry.ids.every((id) => prepared.has(id))}
                                            onChange={(event) => {
                                                const updated = new Set(prepared);
                                                for (const id of entry.ids) {
                                                    if (event.target.checked) updated.add(id);
                                                    else updated.delete(id);
                                                }
                                                onPreparedChange(updated);
                                            }}
                                        />
                                        <span>
                                            {entry.ids.length > 1 && <b>{entry.ids.length} × </b>}
                                            {shoppingTaskLabel(entry, data, t)}
                                            <small>
                                                {t("Poziom")}{" "}
                                                {[...new Set(entry.levels)].join(", ")}
                                            </small>
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null;
            })}
        </details>
    );
}
