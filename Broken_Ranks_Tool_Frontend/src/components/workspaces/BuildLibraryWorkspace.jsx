import { useMemo, useState } from "react";
import { MAX_SAVED_BUILDS } from "../../utils/buildLibrary";
import BuildComparison from "../build_library/BuildComparison";
import { summarizeLocalBuild } from "../build_library/buildLibraryDomain";

const formatSavedAt = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Nieznana data";
    return new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

const BuildLibraryWorkspace = ({
    active = true,
    builds,
    data,
    gameRules,
    onSaveCurrent,
    onOverwrite,
    onLoad,
    onExport,
    onRemove,
    onOpenBuilder,
}) => {
    const [name, setName] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [pendingAction, setPendingAction] = useState(null);
    const availableSelectedIds = useMemo(() => {
        const knownIds = new Set(builds.map((build) => build.id));
        return selectedIds.filter((id) => knownIds.has(id));
    }, [builds, selectedIds]);
    const selectedBuilds = useMemo(
        () => availableSelectedIds.flatMap((id) => builds.find((build) => build.id === id) || []),
        [availableSelectedIds, builds]
    );

    const saveCurrent = (event) => {
        event.preventDefault();
        const saved = onSaveCurrent(name || `Build ${builds.length + 1}`);
        if (saved) setName("");
    };
    const toggleComparison = (id) => {
        setSelectedIds((current) => {
            const knownIds = new Set(builds.map((build) => build.id));
            const available = current.filter((currentId) => knownIds.has(currentId));
            if (available.includes(id)) return available.filter((currentId) => currentId !== id);
            if (available.length >= 3) return available;
            return [...available, id];
        });
    };
    const runPendingAction = (type, id, action) => {
        const key = `${type}:${id}`;
        if (pendingAction !== key) {
            setPendingAction(key);
            return;
        }
        action(id);
        setPendingAction(null);
    };

    return (
        <main
            id={active ? "workspace-content" : undefined}
            hidden={!active}
            className={`build-library-theme w-full flex-1 flex-col gap-4 ${active ? "flex" : "hidden"}`}
        >
            <section className="build-library-heading workbench">
                <div>
                    <p className="section-kicker">Konfiguracje użytkownika</p>
                    <h2>Buildy lokalne</h2>
                    <p>
                        Zapisuj warianty w tej przeglądarce, wracaj do nich jednym kliknięciem i
                        porównuj najważniejsze różnice.
                    </p>
                </div>
                <form onSubmit={saveCurrent} className="build-library-save-form">
                    <label htmlFor="local-build-name">Nazwa bieżącego buildu</label>
                    <div>
                        <input
                            id="local-build-name"
                            value={name}
                            maxLength={48}
                            placeholder={`Build ${builds.length + 1}`}
                            onChange={(event) => setName(event.target.value)}
                        />
                        <button type="submit" disabled={builds.length >= MAX_SAVED_BUILDS}>
                            Zapisz lokalnie
                        </button>
                    </div>
                    <small>
                        {builds.length}/{MAX_SAVED_BUILDS} zapisanych
                    </small>
                </form>
            </section>
            <div className="build-library-layout">
                <aside className="build-library-list-panel workbench">
                    <div className="build-library-panel-heading">
                        <div>
                            <p className="section-kicker">Biblioteka</p>
                            <h3>Zapisane buildy</h3>
                        </div>
                        <span>{availableSelectedIds.length}/3 do porównania</span>
                    </div>
                    {builds.length === 0 ? (
                        <div className="build-library-empty">
                            <span aria-hidden="true">＋</span>
                            <strong>Brak lokalnych buildów</strong>
                            <p>Nazwij bieżącą konfigurację i zapisz ją formularzem powyżej.</p>
                        </div>
                    ) : (
                        <div className="build-library-list custom-scrollbar">
                            {builds.map((build, index) => {
                                const summary = summarizeLocalBuild(build);
                                const selected = availableSelectedIds.includes(build.id);
                                const comparisonLimitReached =
                                    availableSelectedIds.length >= 3 && !selected;
                                return (
                                    <article
                                        className={`saved-build-card${selected ? " is-selected" : ""}`}
                                        key={build.id}
                                    >
                                        <label className="saved-build-compare">
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                disabled={comparisonLimitReached}
                                                onChange={() => toggleComparison(build.id)}
                                            />
                                            Porównaj
                                        </label>
                                        <span className="saved-build-index">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <div className="saved-build-copy">
                                            <strong>{build.name}</strong>
                                            <small>
                                                Poziom {summary.level} · {summary.equipped}/12
                                                przedmiotów
                                            </small>
                                            <span>
                                                {summary.drifs} drifów · {summary.orbs} orbów ·{" "}
                                                {summary.hasStats
                                                    ? "statystyki zapisane"
                                                    : "bez statystyk"}
                                            </span>
                                        </div>
                                        <time dateTime={build.updatedAt || build.savedAt}>
                                            {formatSavedAt(build.updatedAt || build.savedAt)}
                                        </time>
                                        <div className="saved-build-actions">
                                            <button
                                                type="button"
                                                className="is-primary"
                                                onClick={() => {
                                                    if (onLoad(build.id)) onOpenBuilder();
                                                }}
                                            >
                                                Wczytaj
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onExport(build.id)}
                                            >
                                                Eksportuj JSON
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    runPendingAction(
                                                        "overwrite",
                                                        build.id,
                                                        onOverwrite
                                                    )
                                                }
                                            >
                                                {pendingAction === `overwrite:${build.id}`
                                                    ? "Potwierdź nadpisanie"
                                                    : "Nadpisz"}
                                            </button>
                                            <button
                                                type="button"
                                                className="is-danger"
                                                onClick={() =>
                                                    runPendingAction("remove", build.id, onRemove)
                                                }
                                            >
                                                {pendingAction === `remove:${build.id}`
                                                    ? "Potwierdź usunięcie"
                                                    : "Usuń"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </aside>
                <section
                    className="build-comparison-panel workbench"
                    aria-labelledby="comparison-heading"
                >
                    <div className="build-library-panel-heading">
                        <div>
                            <p className="section-kicker">Analiza wariantów</p>
                            <h3 id="comparison-heading">Porównywarka buildów</h3>
                        </div>
                        {availableSelectedIds.length > 0 && (
                            <button type="button" onClick={() => setSelectedIds([])}>
                                Wyczyść wybór
                            </button>
                        )}
                    </div>
                    <BuildComparison
                        builds={selectedBuilds}
                        items={data.items}
                        drifs={data.drifs}
                        gameRules={gameRules}
                    />
                </section>
            </div>
        </main>
    );
};

export default BuildLibraryWorkspace;
