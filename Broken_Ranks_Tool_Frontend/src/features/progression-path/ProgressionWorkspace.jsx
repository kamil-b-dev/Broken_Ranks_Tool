import { useTranslation } from "../../shared/i18n/useTranslation";
import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../shared/api/axiosConfig";
import { parseBuildFile } from "../builds/buildFile";
import { createBuildPayload } from "../builds/buildPayload";
import {
    calculateCharacterStats,
    trimSpentPoints,
    totalPointsForLevel,
} from "../builder/character/characterDevelopmentDomain";
import {
    clone,
    PROFESSIONS,
    RES_SLOTS,
    readProjectDraft,
    parseProject,
    stageFromPayload,
    planningRequest,
    downloadProject,
} from "./progressionProject";
import ProgressionNumberInput from "./ProgressionNumberInput";
import ProgressionResult from "./ProgressionResult";
import useProgressionProjectStorage from "./useProgressionProjectStorage";
import "../../shared/styles/workbench.css";
import "./progression-path.css";

export default function ProgressionWorkspace({
    builds = [],
    data: templates,
    gameRules,
    createSnapshot,
    mobile = false,
}) {
    const { t } = useTranslation();

    const data = useMemo(
        () => ({ ...templates, gameRules: gameRules ?? templates.gameRules ?? {} }),
        [templates, gameRules]
    );
    const [initial] = useState(() => readProjectDraft(data));
    const [project, setProject] = useState(initial.project);
    const persistAllowed = useRef(initial.warning == null);
    const [reportState, setReportState] = useState(null);
    const report = reportState?.data === data ? reportState.value : null;
    const setReport = (value) => setReportState(value == null ? null : { data, value });
    const [error, setError] = useState(null);
    const [storageError, setStorageError] = useProgressionProjectStorage(
        project,
        initial.warning,
        persistAllowed
    );
    const [runningData, setRunningData] = useState(null);
    const running = runningData === data;
    const setRunning = (value) => setRunningData(value ? data : null);
    const revision = useRef(0);
    const transport = useRef(null);
    const importRevision = useRef(0);
    const fileInput = useRef(null);
    const projectInput = useRef(null);

    useEffect(
        () => () => {
            revision.current++;
            importRevision.current++;
            transport.current?.abort();
        },
        []
    );
    useEffect(() => {
        revision.current++;
        transport.current?.abort();
    }, [data]);

    const update = (change) => {
        persistAllowed.current = true;
        setStorageError(null);
        revision.current++;
        importRevision.current++;
        transport.current?.abort();
        setReport(null);
        setError(null);
        setRunning(false);
        setProject((previous) => (typeof change === "function" ? change(previous) : change));
    };
    const capture = (payload, name, nameSource) => {
        const target = stageFromPayload(payload, data, "target", name);
        if (nameSource === "CURRENT_BUILD") target.nameSource = nameSource;
        const weapon = data.items.find(
            (item) =>
                String(item.id) === String(target.payload.build.requestData.slots.weapon?.itemId)
        );
        update((previous) => ({
            ...previous,
            target,
            characterClass:
                weapon?.allowedClasses?.length === 1
                    ? weapon.allowedClasses[0]
                    : previous.characterClass,
        }));
    };
    const selectSource = (source) => {
        if (source === "file") {
            fileInput.current.click();
            return;
        }
        try {
            if (source === "current")
                capture(createSnapshot().payload, "Aktualny build", "CURRENT_BUILD");
            else {
                const build = builds.find((entry) => `build:${entry.id}` === source);
                if (!build) throw new Error("Wybrany build nie istnieje już w bibliotece.");
                capture(build.payload, build.name);
            }
        } catch (failure) {
            setError(failure.message);
        }
    };
    const loadBuildFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const version = ++importRevision.current;
        try {
            const build = await parseBuildFile(file, data);
            if (version === importRevision.current)
                capture(createBuildPayload(build), file.name.replace(/\.[^.]+$/, ""));
        } catch (failure) {
            if (version === importRevision.current) setError(failure.message);
        }
    };
    const loadProject = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const version = ++importRevision.current;
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error("Plik projektu jest zbyt duży.");
            const loaded = parseProject(JSON.parse(await file.text()), data);
            if (version === importRevision.current) {
                update(loaded);
                if (loaded.legacyMigration)
                    setStorageError(
                        "Ze starszego projektu przyjęto ostatni etap jako cel. Etapy wcześniejsze zostaną wygenerowane ponownie."
                    );
            }
        } catch (failure) {
            if (version === importRevision.current) setError(failure.message);
        }
    };
    const run = async () => {
        const version = ++revision.current;
        transport.current?.abort();
        const controller = new AbortController();
        transport.current = controller;
        setReport(null);
        setError(null);
        setRunning(true);
        try {
            const response = await apiClient.post(
                "/progression-path/plan",
                planningRequest(project, data),
                { signal: controller.signal }
            );
            if (version === revision.current) setReport(response.data);
        } catch (failure) {
            if (version === revision.current && !controller.signal.aborted)
                setError(
                    failure.response?.data?.message ||
                        failure.message ||
                        "Nie udało się zaplanować ścieżki."
                );
        } finally {
            if (version === revision.current) setRunning(false);
        }
    };

    return (
        <main id="workspace-content" className="workbench progression-workspace">
            <header className="progression-heading">
                <h1>{t("Ścieżka rozwoju")}</h1>
                <div className="progression-actions">
                    <button onClick={() => downloadProject(project)}>{t("Pobierz projekt")}</button>
                    <button onClick={() => projectInput.current.click()}>
                        {t("Wczytaj projekt")}
                    </button>
                    <input
                        ref={projectInput}
                        hidden
                        type="file"
                        accept=".json"
                        onChange={loadProject}
                    />
                </div>
            </header>
            {error && (
                <p role="alert" className="progression-error">
                    {t(error)}
                </p>
            )}
            {storageError && <p role="status">{t(storageError)}</p>}
            <div className="progression-source">
                <label>
                    {t("Docelowy build")}
                    <select
                        value={project.target ? "target" : ""}
                        onChange={(event) => selectSource(event.target.value)}
                    >
                        <option value="" disabled>
                            {t("Wybierz źródło")}
                        </option>
                        {project.target && (
                            <option value="target" hidden>
                                {project.target.nameSource === "CURRENT_BUILD"
                                    ? t("Aktualny build")
                                    : project.target.name}
                            </option>
                        )}
                        <option value="current">{t("Aktualny kreator")}</option>
                        {builds.length > 0 && (
                            <optgroup label={t("Zapisane buildy")}>
                                {builds.map((build) => (
                                    <option key={build.id} value={`build:${build.id}`}>
                                        {build.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        <option value="file">{t("Wczytaj z pliku…")}</option>
                    </select>
                </label>
                <input
                    ref={fileInput}
                    hidden
                    type="file"
                    accept=".json,.txt"
                    onChange={loadBuildFile}
                />
            </div>
            <section className="progression-controls" aria-label={t("Założenia ścieżki")}>
                <label>
                    {t("Profesja")}
                    <select
                        value={project.characterClass}
                        onChange={(event) =>
                            update({ ...project, characterClass: event.target.value })
                        }
                    >
                        {Object.entries(PROFESSIONS).map(([key, name]) => (
                            <option key={key} value={key}>
                                {t(name)}
                            </option>
                        ))}
                    </select>
                </label>
                {project.target && (
                    <label>
                        {t("Poziom celu")}
                        <ProgressionNumberInput
                            min="1"
                            max="140"
                            value={project.target.characterLevel}
                            onCommit={(level) =>
                                update((previous) => {
                                    const target = clone(previous.target);
                                    target.characterLevel = level;
                                    const config = target.payload.build.characterConfig;
                                    if (config) {
                                        config.level = level;
                                        config.spentPoints = trimSpentPoints(
                                            config.spentPoints,
                                            totalPointsForLevel(level)
                                        );
                                        target.payload.build.requestData.characterStats =
                                            calculateCharacterStats(config.spentPoints);
                                    }
                                    return { ...previous, target };
                                })
                            }
                        />
                    </label>
                )}
                <label
                    className="progression-gap"
                    title={t(
                        "Dotyczy każdego slotu osobno. Przedmioty docelowe, epik i legenda pozostają w planie."
                    )}
                >
                    {t("Pomijaj zmianę ekwipunku co X poziom")}
                    <ProgressionNumberInput
                        min="0"
                        max="140"
                        value={project.minItemLevelGap}
                        onCommit={(minItemLevelGap) => update({ ...project, minItemLevelGap })}
                    />
                </label>
            </section>
            <label
                className="progression-checkbox progression-balance"
                title={t(
                    "Wyrównuje postęp bonusów drifów względem ich wartości w docelowym buildzie."
                )}
            >
                <input
                    type="checkbox"
                    checked={project.balanceStats}
                    onChange={(event) => update({ ...project, balanceStats: event.target.checked })}
                />
                {t("Równomierny rozwój statystyk")}
            </label>
            <fieldset className="progression-res">
                <legend>{t("Blokada pod resy")}</legend>
                {Object.entries(RES_SLOTS).map(([key, name]) => (
                    <label className="progression-checkbox" key={key}>
                        <input
                            type="checkbox"
                            checked={project.resSlots.includes(key)}
                            onChange={(event) =>
                                update({
                                    ...project,
                                    resSlots: event.target.checked
                                        ? [...project.resSlots, key]
                                        : project.resSlots.filter((slot) => slot !== key),
                                })
                            }
                        />
                        {t(name)}
                        {t(project.resSlots.includes(key) ? ": res" : "")}
                    </label>
                ))}
            </fieldset>
            <button className="progression-run" disabled={running || !project.target} onClick={run}>
                {t(running ? "Planowanie…" : "Zaplanuj ścieżkę")}
            </button>
            {running && <p role="status">{t("Generowanie planu…")}</p>}
            {report && <ProgressionResult report={report} data={data} mobile={mobile} />}
        </main>
    );
}
