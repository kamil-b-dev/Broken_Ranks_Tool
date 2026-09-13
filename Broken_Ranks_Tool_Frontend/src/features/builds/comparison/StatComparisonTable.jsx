import CategoryIcon from "../../../shared/ui/CategoryIcon";
import { formatComparisonValue } from "./comparisonValues";

const StatRows = ({ builds, rows }) =>
    rows.map((row) => (
        <div className="build-comparison-row" key={row.key}>
            <span className="build-comparison-label">{row.label}</span>
            {row.values.map((value, index) => (
                <div
                    key={`${builds[index].id}-${row.key}`}
                    className={`${row.differs ? "is-different" : ""} ${row.differs && row.highestIndexes.includes(index) ? "is-highest" : ""}`.trim()}
                >
                    <strong>{formatComparisonValue(value)}</strong>
                </div>
            ))}
        </div>
    ));

/** Cross-build table for character, orb, and drif statistics. */
const StatComparisonTable = ({ builds, sections, onlyDifferences, comparisonStyle }) => {
    const visibleSections = sections
        .map((section) => ({
            ...section,
            rows: section.rows.filter((row) => !onlyDifferences || row.differs),
        }))
        .filter((section) => section.rows.length);

    return (
        <div className="build-comparison-table custom-scrollbar" style={comparisonStyle}>
            <div className="build-comparison-row build-comparison-header">
                <span>Statystyka</span>
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
                                <strong>{section.title}</strong>
                                {section.description ? <small>{section.description}</small> : null}
                            </span>
                            <em>{section.rows.length}</em>
                        </header>
                        <StatRows builds={builds} rows={section.rows} />
                    </section>
                ))
            ) : (
                <p className="build-comparison-no-differences">Brak różnic w wybranym zakresie.</p>
            )}
        </div>
    );
};

export default StatComparisonTable;
