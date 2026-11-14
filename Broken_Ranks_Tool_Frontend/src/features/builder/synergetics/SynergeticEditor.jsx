import { useState } from "react";
import { SYNERGETIC_STATS, validateSynergeticSlot } from "./synergetic";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import "./synergetic.css";

export default function SynergeticEditor({ slotKey, slot, onUpdate }) {
    const { t } = useTranslation();
    const [name, setName] = useState(slot?.synergetic?.name || "Synergetyk");
    const [stats, setStats] = useState(slot?.synergetic?.stats || {});
    const [error, setError] = useState("");
    if (!["ring1", "ring2", "necklace"].includes(slotKey)) return null;
    return (
        <details className="synergetic-editor" open={slot?.synergetic ? true : undefined}>
            <summary>{t("Własny synergetyk")}</summary>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    try {
                        const values = Object.fromEntries(
                            Object.entries(stats)
                                .filter(([, value]) => value !== "")
                                .map(([key, value]) => [key, Number(value)])
                        );
                        const next = {
                            itemId: null,
                            itemStars: 1,
                            drifIds: [],
                            drifLevels: {},
                            orbIds: [],
                            orbLevels: [],
                            synergetic: { name: name.trim(), stats: values },
                        };
                        validateSynergeticSlot(slotKey, next);
                        onUpdate(slotKey, next);
                        setError("");
                    } catch (failure) {
                        setError(failure.message);
                    }
                }}
            >
                <label>
                    {t("Nazwa synergetyka")}
                    <input
                        maxLength={64}
                        required
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </label>
                <div className="synergetic-stat-grid">
                    {SYNERGETIC_STATS.map((key) => (
                        <label key={key}>
                            {t(key)}
                            <input
                                type="number"
                                min="0"
                                max="50000"
                                step="1"
                                value={stats[key] ?? ""}
                                onChange={(event) =>
                                    setStats((previous) => ({
                                        ...previous,
                                        [key]: event.target.value,
                                    }))
                                }
                            />
                        </label>
                    ))}
                </div>
                <button type="submit">{t("Zastosuj synergetyk")}</button>
                {slot?.synergetic && (
                    <button
                        type="button"
                        onClick={() =>
                            onUpdate(slotKey, {
                                itemId: null,
                                itemStars: 1,
                                drifIds: [],
                                drifLevels: {},
                                orbIds: [],
                                orbLevels: [],
                            })
                        }
                    >
                        {t("Usuń synergetyk")}
                    </button>
                )}
            </form>
            {error && <p role="alert">{t(error)}</p>}
        </details>
    );
}
