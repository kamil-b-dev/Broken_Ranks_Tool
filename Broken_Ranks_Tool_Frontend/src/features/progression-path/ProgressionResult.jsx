import { useTranslation } from "../../shared/i18n/useTranslation";
import { useId, useMemo, useState } from "react";
import ProgressionNumberInput from "./ProgressionNumberInput";
import ProgressionMilestone from "./ProgressionMilestone";
import {
    createProgressionView,
    nearestProgressionGroup,
    stoneDescription,
} from "./progressionReport";
import "./progression-report.css";

export default function ProgressionResult({ report, data, mobile = false }) {
    const { t } = useTranslation();

    const { groups } = useMemo(() => createProgressionView(report, data, t), [report, data, t]);
    const [playerLevel, setPlayerLevel] = useState(1);
    const [completed, setCompleted] = useState(() => new Set());
    const [expandedLevel, setExpandedLevel] = useState(
        () => nearestProgressionGroup(groups, 1, new Set())?.level ?? groups[0]?.level
    );
    const idPrefix = useId();
    const next = nearestProgressionGroup(groups, playerLevel, completed);
    const changeLevel = (level) => {
        setPlayerLevel(level);
        setExpandedLevel(nearestProgressionGroup(groups, level, completed)?.level ?? null);
    };
    const complete = (group) => {
        const updated = new Set(completed);
        if (updated.has(group.level)) updated.delete(group.level);
        else updated.add(group.level);
        setCompleted(updated);
        if (updated.has(group.level) && expandedLevel === group.level)
            setExpandedLevel(nearestProgressionGroup(groups, playerLevel, updated)?.level ?? null);
    };
    return (
        <section className="progression-report" aria-label={t("Wynik planowania")}>
            <div className="progression-report-heading">
                <h2>{t(groups.length ? "Plan rozwoju" : "Brak pełnej ścieżki")}</h2>
                {groups.length > 0 && (
                    <span className="progression-progress" role="status">
                        {t("Wykonane etapy: ")}
                        {t(completed.size)}
                        {t(" z ")}
                        {t(groups.length)}
                    </span>
                )}
            </div>
            {groups.length > 0 ? (
                <>
                    <div className="progression-plan-navigation">
                        <label>
                            {t("Twój poziom")}
                            <ProgressionNumberInput
                                min="1"
                                max={groups.at(-1).level}
                                value={playerLevel}
                                onCommit={changeLevel}
                            />
                        </label>
                        {next ? (
                            <button
                                onClick={() => {
                                    setExpandedLevel(next.level);
                                    document
                                        .querySelector(`[data-level="${next.level}"]`)
                                        ?.scrollIntoView?.({
                                            block: "nearest",
                                            behavior: "smooth",
                                        });
                                }}
                            >
                                {t("Najbliższy etap: poziom ")}
                                {t(next.level)}
                            </button>
                        ) : (
                            <p>{t("Wszystkie etapy odhaczone.")}</p>
                        )}
                    </div>
                    {report.warnings.length > 0 && (
                        <details className="progression-assumptions">
                            <summary>{t("Założenia planu")}</summary>
                            {report.warnings.map((warning) => (
                                <p key={warning}>{t(warning)}</p>
                            ))}
                        </details>
                    )}
                </>
            ) : (
                report.warnings.map((warning) => (
                    <p key={warning} role="status">
                        {t(warning)}
                    </p>
                ))
            )}
            <ol className="progression-timeline" aria-label={t("Etapy według poziomu")}>
                {groups.map((group) => (
                    <ProgressionMilestone
                        key={group.level}
                        group={group}
                        data={data}
                        mobile={mobile}
                        resSlots={report.resSlots ?? []}
                        idPrefix={idPrefix}
                        expanded={expandedLevel === group.level}
                        recommended={next?.level === group.level}
                        completed={completed.has(group.level)}
                        onToggle={() =>
                            setExpandedLevel(expandedLevel === group.level ? null : group.level)
                        }
                        onComplete={() => complete(group)}
                    />
                ))}
            </ol>
            {report.remainingDrifs.length > 0 && (
                <details className="progression-spare">
                    <summary>
                        {t("Pozostałe wolne drify (")}
                        {t(report.remainingDrifs.length)})
                    </summary>
                    <ul>
                        {report.remainingDrifs.map((stone) => (
                            <li key={stone.instanceId}>
                                {t(
                                    stoneDescription("drif", stone.templateId, stone.level, data, t)
                                )}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
