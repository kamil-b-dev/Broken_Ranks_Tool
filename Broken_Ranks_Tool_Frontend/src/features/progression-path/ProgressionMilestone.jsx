import { useTranslation } from "../../shared/i18n/useTranslation";
import { downloadBuildPayload } from "../builds/buildDownloads";
import { stageBuildPayload } from "./progressionProject";
import { itemName, SLOT_NAMES, findTemplate, itemUpgradeDescription } from "./progressionReport";
import { ProgressionConfiguration, ProgressionInstructions, Stone } from "./ProgressionDetails";
import ProgressionTransfers from "./ProgressionTransfers";
import { stoneActionContext } from "./progressionStoneActions";

export default function ProgressionMilestone({
    group,
    data,
    mobile,
    resSlots,
    expanded,
    recommended,
    completed,
    onToggle,
    onComplete,
    idPrefix,
}) {
    const { t } = useTranslation();

    const panelId = `${idPrefix}-level-${group.level}`;
    return (
        <li
            className={`${completed ? "is-completed" : ""} ${recommended ? "is-recommended" : ""}`}
            data-level={group.level}
        >
            <div className="progression-milestone-heading">
                <h3>
                    <button
                        className="progression-stage-toggle"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={onToggle}
                    >
                        <span className="progression-level">
                            <small>{t("Poziom")}</small> {t(group.level)}
                        </span>
                        <span className="progression-milestone-title">
                            <strong title={t(group.title)}>{t(group.title)}</strong>
                            <span className="progression-counts">
                                {group.prepareCount > 0 && (
                                    <span>
                                        {t("Przygotuj: ")}
                                        {t(group.prepareCount)}
                                    </span>
                                )}
                                {group.upgradeCount > 0 && (
                                    <span>
                                        {t("Ulepsz: ")}
                                        {t(group.upgradeCount)}
                                    </span>
                                )}
                                {group.moveCount > 0 && (
                                    <span>
                                        {t("Przenieś: ")}
                                        {t(group.moveCount)}
                                    </span>
                                )}
                            </span>
                            {recommended && (
                                <small className="progression-next-tag">
                                    {t("Najbliższy etap")}
                                </small>
                            )}
                        </span>
                        <span className="progression-chevron" aria-hidden="true">
                            {t(expanded ? "−" : "+")}
                        </span>
                    </button>
                </h3>
                <label className="progression-completed">
                    <input
                        type="checkbox"
                        aria-label={t("Poziom {0} wykonany", [t(group.level)])}
                        checked={completed}
                        onChange={onComplete}
                    />
                    <span>{t("Wykonane")}</span>
                </label>
            </div>
            {expanded && (
                <div id={panelId} className="progression-milestone-body">
                    {group.prepareCount + group.upgradeCount + group.moveCount > 0 ? (
                        <>
                            {group.prepareCount + group.upgradeCount > 0 && (
                                <div className="progression-task-groups">
                                    {group.prepareCount > 0 && (
                                        <section>
                                            <h4>{t("Przygotuj")}</h4>
                                            <ul>
                                                {group.purchases.map((entry) => (
                                                    <li key={entry.itemId}>
                                                        {t(
                                                            entry.count > 1
                                                                ? `${entry.count} × `
                                                                : ""
                                                        )}
                                                        {findTemplate(entry.itemId, data.items)
                                                            ?.name ?? entry.itemId}
                                                    </li>
                                                ))}
                                                {group.supplies.map((entry) => (
                                                    <li
                                                        key={`${entry.kind}:${entry.templateId}:${entry.level}`}
                                                    >
                                                        {entry.count > 1 && (
                                                            <span>{t(entry.count)} × </span>
                                                        )}
                                                        <Stone
                                                            kind={entry.kind}
                                                            id={entry.templateId}
                                                            level={entry.level}
                                                            data={data}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                    {group.upgradeCount > 0 && (
                                        <section>
                                            <h4>{t("Ulepsz")}</h4>
                                            <ul>
                                                {group.itemUpgrades.map((path) => (
                                                    <li key={path.slot}>
                                                        <strong>
                                                            {t(SLOT_NAMES[path.slot])}:{" "}
                                                        </strong>
                                                        {t(itemUpgradeDescription(path, data, t))}
                                                    </li>
                                                ))}
                                                {group.upgrades.map((entry) => (
                                                    <li key={`${entry.kind}:${entry.instanceId}`}>
                                                        <Stone
                                                            kind={entry.kind}
                                                            id={entry.beforeTemplateId}
                                                            level={entry.beforeLevel}
                                                            data={data}
                                                        />
                                                        {t(" ")}→{t(" ")}
                                                        <Stone
                                                            kind={entry.kind}
                                                            id={entry.templateId}
                                                            level={entry.level}
                                                            data={data}
                                                        />
                                                        <small className="progression-instance">
                                                            {stoneActionContext(
                                                                entry,
                                                                entry.kind,
                                                                group,
                                                                data,
                                                                t
                                                            )}
                                                        </small>
                                                    </li>
                                                ))}
                                                {group.builtInUpgrades.map((entry) => (
                                                    <li key={entry.key}>
                                                        <Stone
                                                            kind="drif"
                                                            id={entry.templateId}
                                                            level={entry.level}
                                                            data={data}
                                                        />
                                                        <small className="progression-instance">
                                                            {t("Wbudowany ·")}
                                                            {t(" ")}
                                                            {t(
                                                                itemName(
                                                                    { itemId: entry.itemId },
                                                                    data,
                                                                    t
                                                                )
                                                            )}
                                                            {t(" · poziom ")}
                                                            {t(entry.beforeLevel)} →{" "}
                                                            {t(entry.level)}
                                                        </small>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                </div>
                            )}
                            {group.moveCount > 0 && (
                                <ProgressionTransfers group={group} data={data} />
                            )}
                        </>
                    ) : (
                        <p>
                            {t(
                                group.isFinal
                                    ? "Build docelowy. Brak dalszych zmian."
                                    : "Zwykły ekwipunek do pierwszego zakupu z planu."
                            )}
                        </p>
                    )}
                    {mobile ? (
                        <ProgressionInstructions group={group} data={data} resSlots={resSlots} />
                    ) : (
                        <ProgressionConfiguration group={group} data={data} resSlots={resSlots} />
                    )}
                    <button
                        className="progression-export"
                        title={t(
                            "Plik buildu zapisuje wyposażenie. Rezerwacje res zachowuje plik projektu ścieżki."
                        )}
                        onClick={() => downloadBuildPayload(stageBuildPayload(group.final))}
                    >
                        {t("Eksportuj ekwipunek etapu")}
                    </button>
                </div>
            )}
        </li>
    );
}
