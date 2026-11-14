import { useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { replacementRequest } from "./itemPreview";
import "./item-preview.css";

export default function ItemReplacementPreview({ requestData, slotKey, items, data, gameRules }) {
    const { t, locale } = useTranslation();
    const [selected, setSelected] = useState("");
    const [keep, setKeep] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const identity = JSON.stringify([requestData, slotKey, selected, keep]);
    const visible = result?.identity === identity ? result : null;
    return (
        <details className="item-preview">
            <summary>{t("Podgląd wymiany przedmiotu")}</summary>
            <label>
                {t("Przedmiot do porównania")}
                <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                    <option value="">{t("Wybierz przedmiot")}</option>
                    {items.map((item) => (
                        <option value={item.id} key={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={keep}
                    onChange={(event) => setKeep(event.target.checked)}
                />
                {t("Zachowaj orby i zwykłe drify, jeśli pasują")}
            </label>
            <p>{t("Zamiennik ma 1★. Wbudowane drify zaczynają od poziomu 1.")}</p>
            <button
                type="button"
                disabled={busy || !selected}
                onClick={async () => {
                    setError(null);
                    setBusy(true);
                    try {
                        const next = replacementRequest(
                            requestData,
                            slotKey,
                            items.find((item) => String(item.id) === selected),
                            { ...data, gameRules },
                            keep
                        );
                        const [before, after] = await Promise.all([
                            calculateEquipmentStats(requestData),
                            calculateEquipmentStats(next),
                        ]);
                        setResult({
                            identity,
                            before: before.stats || before,
                            after: after.stats || after,
                        });
                    } catch (failure) {
                        setError({
                            identity,
                            message: failure.response?.data?.message || failure.message,
                        });
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {t("Sprawdź zmianę")}
            </button>
            {error?.identity === identity && <p role="alert">{t(error.message)}</p>}
            {visible && (
                <dl>
                    {[
                        ...new Set([...Object.keys(visible.before), ...Object.keys(visible.after)]),
                    ].flatMap((name) => {
                        const before = visible.before[name] ?? 0;
                        const after = visible.after[name] ?? 0;
                        if (before === after) return [];
                        const delta =
                            Number.parseFloat(String(after).replace(",", ".")) -
                            Number.parseFloat(String(before).replace(",", "."));
                        return [
                            <div key={name}>
                                <dt>{t(gameRules?.bonusTranslations?.[name] || name)}</dt>
                                <dd>
                                    {before} → {after}
                                    {Number.isFinite(delta)
                                        ? ` (${delta > 0 ? "+" : ""}${delta.toLocaleString(locale, { maximumFractionDigits: 2 })}${String(after).includes("%") ? " p.p." : ""})`
                                        : ""}
                                </dd>
                            </div>,
                        ];
                    })}
                    {JSON.stringify(visible.before) === JSON.stringify(visible.after) && (
                        <p>{t("Statystyki pozostają takie same.")}</p>
                    )}
                </dl>
            )}
        </details>
    );
}
