import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import { stageFromPayload, normalizeRequiredItems } from "./progressionProject";
import { parseBuildFile } from "../builds/buildFile";
import { createBuildPayload } from "../builds/buildPayload";

export default function ProgressionStartingControls({
    project,
    update,
    builds,
    data,
    createSnapshot,
}) {
    const { t } = useTranslation();
    const input = useRef(null);
    const revision = useRef(0);
    const [error, setError] = useState("");
    const [slot, setSlot] = useState("helmet");
    const [level, setLevel] = useState("80");
    const [itemId, setItemId] = useState("");
    useEffect(() => {
        const current = revision;
        return () => {
            current.current++;
        };
    }, [data]);
    const capture = (payload, name) => {
        const startingPoint = stageFromPayload(payload, data, "start", name);
        update((previous) => ({ ...previous, startingPoint }));
    };
    const definition = SLOTS.find((entry) => entry.key === slot);
    const categories = Array.isArray(definition.cat) ? definition.cat : [definition.cat];
    const required = project.requiredItems || [];
    return (
        <div className="progression-starting-controls">
            <label>
                {t("Początek ścieżki")}
                <select
                    value={project.startingPoint ? "selected" : "none"}
                    onChange={(event) => {
                        revision.current++;
                        setError("");
                        try {
                            const source = event.target.value;
                            if (source === "none")
                                update((previous) => ({ ...previous, startingPoint: null }));
                            else if (source === "current")
                                capture(createSnapshot().payload, t("Aktualny build"));
                            else if (source === "file") input.current.click();
                            else {
                                const build = builds.find((entry) => entry.id === source);
                                if (!build) throw new Error("Nie znaleziono buildu początkowego.");
                                capture(build.payload, build.name);
                            }
                        } catch (failure) {
                            setError(failure.message);
                        }
                    }}
                >
                    <option value="none">{t("Od poziomu 1")}</option>
                    {project.startingPoint && (
                        <option value="selected" hidden>
                            {project.startingPoint.name} · {project.startingPoint.characterLevel}
                        </option>
                    )}
                    <option value="current" disabled={!createSnapshot}>
                        {t("Aktualny ekwipunek i plecak")}
                    </option>
                    {builds.map((build) => (
                        <option key={build.id} value={build.id}>
                            {build.name}
                        </option>
                    ))}
                    <option value="file">{t("Wczytaj z pliku…")}</option>
                </select>
            </label>
            <input
                ref={input}
                type="file"
                accept=".json,.txt"
                hidden
                onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const version = ++revision.current;
                    try {
                        const parsed = await parseBuildFile(file, data);
                        if (version === revision.current)
                            capture(createBuildPayload(parsed), file.name);
                    } catch (failure) {
                        if (version === revision.current) setError(failure.message);
                    }
                }}
            />
            <details>
                <summary>{t("Obowiązkowe przedmioty pośrednie")}</summary>
                <ul>
                    {required.map((entry, index) => (
                        <li key={`${entry.slot}:${entry.characterLevel}`}>
                            {entry.characterLevel} ·{" "}
                            {t(SLOTS.find((slot) => slot.key === entry.slot)?.label || entry.slot)}{" "}
                            ·{" "}
                            {
                                data.items.find((item) => String(item.id) === String(entry.itemId))
                                    ?.name
                            }
                            <button
                                type="button"
                                onClick={() =>
                                    update((previous) => ({
                                        ...previous,
                                        requiredItems: required.filter(
                                            (_, position) => position !== index
                                        ),
                                    }))
                                }
                            >
                                {t("Usuń etap obowiązkowy")}
                            </button>
                        </li>
                    ))}
                </ul>
                <form
                    className="progression-controls"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setError("");
                        try {
                            const requiredItems = normalizeRequiredItems(
                                [
                                    ...required,
                                    { slot, characterLevel: Number(level), itemId: Number(itemId) },
                                ],
                                data,
                                project.startingPoint?.characterLevel ?? 1,
                                project.target?.characterLevel ?? 140,
                                project.resSlots
                            );
                            update((previous) => ({ ...previous, requiredItems }));
                        } catch (failure) {
                            setError(failure.message);
                        }
                    }}
                >
                    <label>
                        {t("Slot etapu")}
                        <select
                            value={slot}
                            onChange={(event) => {
                                setSlot(event.target.value);
                                setItemId("");
                            }}
                        >
                            {SLOTS.map((slot) => (
                                <option key={slot.key} value={slot.key}>
                                    {t(slot.label)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        {t("Poziom etapu")}
                        <input
                            type="number"
                            min="1"
                            max="140"
                            required
                            step="1"
                            value={level}
                            onChange={(event) => setLevel(event.target.value)}
                        />
                    </label>
                    <label>
                        {t("Przedmiot etapu")}
                        <select
                            value={itemId}
                            required
                            onChange={(event) => setItemId(event.target.value)}
                        >
                            <option value="">{t("Wybierz przedmiot")}</option>
                            {data.items
                                .filter((item) => categories.includes(item.category))
                                .map((item) => (
                                    <option value={item.id} key={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <button type="submit" disabled={required.length >= 24}>
                        {t("Dodaj etap obowiązkowy")}
                    </button>
                </form>
            </details>
            {error && <p role="alert">{t(error)}</p>}
        </div>
    );
}
