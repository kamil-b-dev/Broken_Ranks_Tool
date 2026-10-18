import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useState } from "react";
import { summarizeLocalBuild } from "../comparison/buildComparisonData";
const savedDateFormatter = (locale) =>
    new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatSavedAt = (value, locale) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Nieznana data";
    return savedDateFormatter(locale).format(date);
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
    const { t, locale } = useTranslation();

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
                <strong>{t("Brak lokalnych buildów")}</strong>
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
                            {t("Porównaj")}
                        </label>
                        <span className="saved-build-index">
                            {t(String(index + 1).padStart(2, "0"))}
                        </span>
                        <div className="saved-build-copy">
                            <strong>{build.name}</strong>
                            <small>
                                {t("Poziom ")}
                                {t(summary.level)} · {t(summary.equipped)}
                                {t("/12 przedmiotów")}
                            </small>
                            <span>
                                {t(summary.drifs)}
                                {t(" drifów · ")}
                                {t(summary.orbs)}
                                {t(" orbów ·")}
                                {t(" ")}
                                {t(summary.hasStats ? "statystyki zapisane" : "bez statystyk")}
                            </span>
                        </div>
                        <time dateTime={build.updatedAt || build.savedAt}>
                            {t(formatSavedAt(build.updatedAt || build.savedAt, locale))}
                        </time>
                        <div className="saved-build-actions">
                            <button
                                type="button"
                                className="is-primary"
                                onClick={async () => {
                                    if (await onLoad(build.id)) onOpenBuilder();
                                }}
                            >
                                {t("Wczytaj")}
                            </button>
                            <button type="button" onClick={() => onExport(build.id)}>
                                {t("Eksportuj JSON")}
                            </button>
                            <button
                                type="button"
                                onClick={() => runPendingAction("overwrite", build.id, onOverwrite)}
                            >
                                {t(
                                    pendingAction === `overwrite:${build.id}`
                                        ? "Potwierdź nadpisanie"
                                        : "Nadpisz"
                                )}
                            </button>
                            <button
                                type="button"
                                className="is-danger"
                                onClick={() => runPendingAction("remove", build.id, onRemove)}
                            >
                                {t(
                                    pendingAction === `remove:${build.id}`
                                        ? "Potwierdź usunięcie"
                                        : "Usuń"
                                )}
                            </button>
                        </div>
                    </article>
                );
            })}
        </div>
    );
};

export default SavedBuildList;
