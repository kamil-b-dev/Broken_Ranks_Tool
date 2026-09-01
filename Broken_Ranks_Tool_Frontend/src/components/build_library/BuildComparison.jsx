import { useMemo, useState } from "react";
import {
    createEquipmentComparisonRows,
    createStatComparisonRows,
    formatComparisonValue,
    summarizeLocalBuild,
} from "./buildLibraryDomain";

const BuildComparison = ({ builds, items, bonusTranslations }) => {
    const [activeSection, setActiveSection] = useState("equipment");
    const [onlyDifferences, setOnlyDifferences] = useState(true);
    const equipmentRows = useMemo(
        () => createEquipmentComparisonRows(builds, items),
        [builds, items]
    );
    const statRows = useMemo(
        () => createStatComparisonRows(builds, bonusTranslations),
        [bonusTranslations, builds]
    );
    const visibleRows = (activeSection === "equipment" ? equipmentRows : statRows).filter(
        (row) => !onlyDifferences || row.differs
    );
    const comparisonStyle = { "--comparison-columns": builds.length };

    if (builds.length < 2)
        return (
            <div className="build-comparison-empty">
                <span aria-hidden="true">⇄</span>
                <strong>Wybierz co najmniej dwa buildy</strong>
                <p>Zaznacz konfiguracje po lewej stronie, aby zestawić ekwipunek i statystyki.</p>
            </div>
        );

    return (
        <div className="build-comparison-content">
            <div className="build-comparison-summary" style={comparisonStyle}>
                {builds.map((build, index) => {
                    const summary = summarizeLocalBuild(build);
                    return (
                        <article
                            key={build.id}
                            className={`build-comparison-hero tone-${index + 1}`}
                        >
                            <span>Build {index + 1}</span>
                            <strong>{build.name}</strong>
                            <small>
                                Poziom {summary.level} · {summary.equipped}/12 przedmiotów
                            </small>
                        </article>
                    );
                })}
            </div>
            <div className="build-comparison-toolbar">
                <div role="tablist" aria-label="Zakres porównania buildów">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSection === "equipment"}
                        onClick={() => setActiveSection("equipment")}
                    >
                        Ekwipunek
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSection === "stats"}
                        onClick={() => setActiveSection("stats")}
                    >
                        Statystyki
                    </button>
                </div>
                <label>
                    <input
                        type="checkbox"
                        checked={onlyDifferences}
                        onChange={(event) => setOnlyDifferences(event.target.checked)}
                    />
                    Tylko różnice
                </label>
            </div>
            <div className="build-comparison-table custom-scrollbar" style={comparisonStyle}>
                <div className="build-comparison-row build-comparison-header">
                    <span>{activeSection === "equipment" ? "Slot" : "Statystyka"}</span>
                    {builds.map((build) => (
                        <strong key={build.id}>{build.name}</strong>
                    ))}
                </div>
                {visibleRows.length === 0 ? (
                    <p className="build-comparison-no-differences">
                        Brak różnic w wybranym zakresie.
                    </p>
                ) : (
                    visibleRows.map((row) => (
                        <div className="build-comparison-row" key={row.key}>
                            <span className="build-comparison-label">{row.label}</span>
                            {activeSection === "equipment"
                                ? row.values.map((value, index) => (
                                      <div
                                          key={`${builds[index].id}-${row.key}`}
                                          className={row.differs ? "is-different" : ""}
                                      >
                                          <strong>{value.itemName}</strong>
                                          {value.itemName !== "Pusty slot" && (
                                              <small>
                                                  {value.tier ? `Tier ${value.tier} · ` : ""}
                                                  {value.stars > 0 ? `${value.stars}★ · ` : ""}
                                                  {value.drifCount} drif · {value.orbCount} orb
                                              </small>
                                          )}
                                      </div>
                                  ))
                                : row.values.map((value, index) => (
                                      <div
                                          key={`${builds[index].id}-${row.key}`}
                                          className={`${row.differs ? "is-different" : ""} ${row.differs && row.highestIndexes.includes(index) ? "is-highest" : ""}`.trim()}
                                      >
                                          <strong>{formatComparisonValue(value)}</strong>
                                      </div>
                                  ))}
                        </div>
                    ))
                )}
            </div>
            {activeSection === "stats" && builds.some((build) => !build.stats) && (
                <p className="build-comparison-hint">
                    „—” oznacza, że build zapisano bez wcześniejszego przeliczenia statystyk.
                </p>
            )}
        </div>
    );
};

export default BuildComparison;
