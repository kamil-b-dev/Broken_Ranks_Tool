import { useTranslation } from "../../../shared/i18n/useTranslation";
import StatValue from "./StatValue";

/** Shared result rows keep the same alignment in desktop and mobile summaries. */
export default function StatRows({
    values,
    onExplain,
    disabled = false,
    rowClassName = "",
    valueClassName = "",
}) {
    const { t, locale } = useTranslation();
    const hasDrifs = values.some(({ drifSummary }) => drifSummary);
    const format = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
    return (
        <div className={`stat-rows ${hasDrifs ? "stat-rows-with-drifs" : ""}`}>
            {hasDrifs && (
                <div className="stat-columns-heading stat-columns-grid" aria-hidden="true">
                    <span className="stat-mod-heading">{t("Mod")}</span>
                    <span>{t("Drify")}</span>
                    <span>{t("Mnożnik")}</span>
                    <span>{t("Wynik")}</span>
                </div>
            )}
            <ul className="stat-result-list">
                {values.map(({ key, displayName, val, drifSummary, capLabel }) => {
                    const content = (
                        <>
                            <span className="stat-name">{t(displayName)}</span>
                            {hasDrifs && (
                                <>
                                    <span className="stat-drif-count">
                                        {drifSummary?.count ?? "—"}
                                    </span>
                                    <span className="stat-drif-multiplier">
                                        {drifSummary ? format.format(drifSummary.multiplier) : "—"}
                                    </span>
                                </>
                            )}
                            <StatValue value={val} capLabel={capLabel} className={valueClassName} />
                        </>
                    );
                    return (
                        <li key={key} className={`stat-result-row ${rowClassName}`}>
                            {onExplain ? (
                                <button
                                    type="button"
                                    className={`stat-explain-trigger ${hasDrifs ? "stat-columns-grid" : ""}`}
                                    disabled={disabled}
                                    onClick={(event) => onExplain(key, event.currentTarget)}
                                    aria-haspopup="dialog"
                                    aria-label={`${t(displayName)} ${t(val)}`}
                                    aria-description={
                                        [drifSummary?.description, capLabel]
                                            .filter(Boolean)
                                            .join(" · ") || undefined
                                    }
                                >
                                    {content}
                                </button>
                            ) : (
                                <div
                                    className={`stat-static-row ${hasDrifs ? "stat-columns-grid" : ""}`}
                                >
                                    {content}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
