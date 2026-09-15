import { useState } from "react";
import { summarizeLocalBuild } from "../comparison/buildComparisonData";

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

const SavedBuildList = ({
    builds,
    selectedIds,
    onToggleComparison,
    onLoad,
    onOpenBuilder,
    onExport,
    onOverwrite,
    onRemove,
}) => {
    const [pendingAction, setPendingAction] = useState(null);

    const runPendingAction = (type, id, action) => {
        const key = `${type}:${id}`;
        if (pendingAction !== key) {
            setPendingAction(key);
            return;
        }
        action(id);
        setPendingAction(null);
    };

    if (builds.length === 0)
        return (
            <div className="build-library-empty">
                <strong>Brak lokalnych buildów</strong>
            </div>
        );

    return (
        <div className="build-library-list custom-scrollbar">
            {builds.map((build, index) => {
                const summary = summarizeLocalBuild(build);
                const selected = selectedIds.includes(build.id);
                const comparisonLimitReached = selectedIds.length >= 3 && !selected;
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
                                onChange={() => onToggleComparison(build.id)}
                            />
                            Porównaj
                        </label>
                        <span className="saved-build-index">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="saved-build-copy">
                            <strong>{build.name}</strong>
                            <small>
                                Poziom {summary.level} · {summary.equipped}/12 przedmiotów
                            </small>
                            <span>
                                {summary.drifs} drifów · {summary.orbs} orbów ·{" "}
                                {summary.hasStats ? "statystyki zapisane" : "bez statystyk"}
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
                            <button type="button" onClick={() => onExport(build.id)}>
                                Eksportuj JSON
                            </button>
                            <button
                                type="button"
                                onClick={() => runPendingAction("overwrite", build.id, onOverwrite)}
                            >
                                {pendingAction === `overwrite:${build.id}`
                                    ? "Potwierdź nadpisanie"
                                    : "Nadpisz"}
                            </button>
                            <button
                                type="button"
                                className="is-danger"
                                onClick={() => runPendingAction("remove", build.id, onRemove)}
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
    );
};

export default SavedBuildList;
