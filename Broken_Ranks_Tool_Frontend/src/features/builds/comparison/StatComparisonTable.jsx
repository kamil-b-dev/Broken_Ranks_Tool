import { useTranslation } from "../../../shared/i18n/useTranslation";
import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { formatComparisonValue } from "./comparisonValues";

const StatRows = ({ builds, rows }) => {
    const { t, locale } = useTranslation();
    return rows.map((row) => (
        <div className="build-comparison-row" key={row.key}>
            <span className="build-comparison-label">{t(row.label)}</span>
            {row.values.map((value, index) => (
                <div
                    key={`${builds[index].id}-${row.key}`}
                    className={`${row.differs ? "is-different" : ""} ${row.differs && row.highestIndexes.includes(index) ? "is-highest" : ""}`.trim()}
                >
                    <strong>{formatComparisonValue(value, locale)}</strong>
                </div>
            ))}
        </div>
    ));
};

/** Cross-build table for character, orb, and drif statistics. */
const StatComparisonTable = ({ builds, sections, onlyDifferences, comparisonStyle }) => {
    const { t } = useTranslation();

    const visibleSections = sections
        .map((section) => ({
            ...section,
            rows: section.rows.filter((row) => !onlyDifferences || row.differs),
        }))
        .filter((section) => section.rows.length);

    return (
        <div className="build-comparison-table custom-scrollbar" style={comparisonStyle}>
            <div className="build-comparison-row build-comparison-header">
                <span>{t("Statystyka")}</span>
                {builds.map((build) => (
                    <strong key={build.id}>{build.name}</strong>
                ))}
            </div>
            {visibleSections.length ? (
                visibleSections.map((section) => (
                    <section
                        className="build-comparison-stat-section"
                        data-category={section.category?.toLowerCase()}
                        key={section.key}
                    >
                        <header>
                            {section.category ? (
                                <CategoryIcon kind="drif" category={section.category} />
                            ) : null}
                            <span>
                                <strong>{t(section.title)}</strong>
                                {section.description ? (
                                    <small>{t(section.description)}</small>
                                ) : null}
                            </span>
                            <em>{t(section.rows.length)}</em>
                        </header>
                        <StatRows builds={builds} rows={section.rows} />
                    </section>
                ))
            ) : (
                <p className="build-comparison-no-differences">
                    {t("Brak różnic w wybranym zakresie.")}
                </p>
            )}
        </div>
    );
};

export default StatComparisonTable;
