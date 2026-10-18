import { useTranslation } from "../../../shared/i18n/useTranslation";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../../shared/domain/equipment/drifCategories";
import { DRIF_SIZE_LABELS, DRIF_SIZE_ORDER } from "../../../shared/domain/equipment/drifCategories";
import { CATEGORY_DESCRIPTIONS, formatAverage } from "./comparisonPresentation";

const DrifToken = ({ entry }) => {
    const { t } = useTranslation();

    const levels = entry.levels || [];
    const minimumLevel = entry.minimumLevel ?? (levels.length ? Math.min(...levels) : null);
    const maximumLevel = entry.maximumLevel ?? (levels.length ? Math.max(...levels) : null);
    const levelLabel =
        minimumLevel == null
            ? null
            : minimumLevel === maximumLevel
              ? `poz. ${minimumLevel}`
              : `poz. ${minimumLevel}–${maximumLevel}`;
    return (
        <div className="build-drif-token" data-category={entry.category?.toLowerCase()}>
            <CategoryIcon kind="drif" category={entry.category} />
            <span>
                <strong>{entry.name}</strong>
                {entry.bonusLabel && entry.bonusLabel !== entry.name ? (
                    <small>{t(entry.bonusLabel)}</small>
                ) : null}
            </span>
            <i title={t(entry.size || "Nieznany rozmiar")}>
                {t(DRIF_SIZE_LABELS[entry.size] || "?")}
            </i>
            <em>
                ×{t(entry.count)}
                {t(levelLabel ? ` · ${levelLabel}` : "")}
            </em>
        </div>
    );
};

/** Composition, common core, and unique drifs across compared builds. */
const DrifComposition = ({ analysis, comparisonStyle }) => {
    const { t, locale } = useTranslation();
    return (
        <div className="build-drif-analysis">
            <section className="build-drif-profile">
                <div className="build-drif-analysis-heading">
                    <span>
                        <strong>{t("Profil drifów")}</strong>
                        <small>{t("Liczba, średni poziom i rozkład rozmiarów")}</small>
                    </span>
                </div>
                <div className="build-drif-profile-grid" style={comparisonStyle}>
                    <span />
                    {analysis.builds.map((build) => (
                        <strong key={build.id}>
                            {build.name}
                            <small>
                                {t(build.total)}
                                {t(" drifów · śr. poz. ")}
                                {formatAverage(build.averageLevel, locale)}
                            </small>
                        </strong>
                    ))}
                    {DRIF_CATEGORY_ORDER.map((category) => (
                        <div className="build-drif-profile-row" key={category}>
                            <span className="build-drif-profile-label">
                                <CategoryIcon kind="drif" category={category} />
                                <span>
                                    <strong>{t(DRIF_CATEGORY_LABELS[category])}</strong>
                                    <small>{t(CATEGORY_DESCRIPTIONS[category])}</small>
                                </span>
                            </span>
                            {analysis.builds.map((build) => {
                                const summary = build.categories[category];
                                return (
                                    <div key={build.id} data-category={category.toLowerCase()}>
                                        <strong>{t(summary.count)}</strong>
                                        <span>
                                            {t("śr. poz. ")}
                                            {formatAverage(summary.averageLevel, locale)}
                                        </span>
                                        <small>
                                            {DRIF_SIZE_ORDER.map((size) => (
                                                <i
                                                    className={
                                                        summary.sizes[size] ? "has-value" : ""
                                                    }
                                                    key={size}
                                                    title={t(size)}
                                                >
                                                    {t(DRIF_SIZE_LABELS[size])}{" "}
                                                    {t(summary.sizes[size])}
                                                </i>
                                            ))}
                                        </small>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </section>
            <section className="build-drif-common">
                <div className="build-drif-analysis-heading">
                    <span>
                        <strong>{t("Część wspólna")}</strong>
                        <small>{t("Te same drify obecne w każdym porównywanym buildzie")}</small>
                    </span>
                    <em>{t(analysis.common.reduce((sum, entry) => sum + entry.count, 0))}</em>
                </div>
                {analysis.common.length ? (
                    <div className="build-drif-category-groups">
                        {DRIF_CATEGORY_ORDER.flatMap((category) => {
                            const entries = analysis.common.filter(
                                (entry) => entry.category === category
                            );
                            if (!entries.length) return [];
                            return [
                                <div key={category}>
                                    <span>{t(DRIF_CATEGORY_LABELS[category])}</span>
                                    <div>
                                        {entries.map((entry) => (
                                            <DrifToken entry={entry} key={entry.id} />
                                        ))}
                                    </div>
                                </div>,
                            ];
                        })}
                    </div>
                ) : (
                    <p className="build-drif-empty">
                        {t("Brak wspólnych drifów we wszystkich buildach.")}
                    </p>
                )}
            </section>
            <section className="build-drif-unique">
                <div className="build-drif-analysis-heading">
                    <span>
                        <strong>{t("Poza wspólną częścią")}</strong>
                        <small>{t("Drify, którymi buildy różnią się od wspólnej części")}</small>
                    </span>
                </div>
                <div className="build-drif-unique-grid" style={comparisonStyle}>
                    {analysis.outsideCommon.map((build) => (
                        <article key={build.id}>
                            <strong>{build.name}</strong>
                            {build.entries.length ? (
                                build.entries.map((entry) => (
                                    <DrifToken entry={entry} key={entry.id} />
                                ))
                            ) : (
                                <small>
                                    {t("Brak — build składa się wyłącznie ze wspólnego rdzenia.")}
                                </small>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DrifComposition;
