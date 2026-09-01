import { useMemo, useState } from "react";
import CategoryIcon from "../CategoryIcon";
import { DRIF_CATEGORY_LABELS, DRIF_CATEGORY_ORDER } from "../optimization/optimizerDomain";
import {
    createDrifComposition,
    createEquipmentComparisonRows,
    createStatComparisonGroups,
    DRIF_SIZE_LABELS,
    DRIF_SIZE_ORDER,
    formatComparisonValue,
    summarizeLocalBuild,
} from "./buildLibraryDomain";

const CATEGORY_DESCRIPTIONS = {
    OFFENSIVE: "Presja, trafienie i obrażenia",
    DEFENSIVE: "Redukcje, obrona i odporności",
    UTILITY: "Zasoby, regeneracja i kontrola",
};

const formatAverage = (value) =>
    value == null
        ? "—"
        : value.toLocaleString("pl-PL", {
              minimumFractionDigits: value % 1 ? 1 : 0,
              maximumFractionDigits: 1,
          });

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

const DrifToken = ({ entry }) => {
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
                    <small>{entry.bonusLabel}</small>
                ) : null}
            </span>
            <i title={entry.size || "Nieznany rozmiar"}>{DRIF_SIZE_LABELS[entry.size] || "?"}</i>
            <em>
                ×{entry.count}
                {levelLabel ? ` · ${levelLabel}` : ""}
            </em>
        </div>
    );
};

const DrifComposition = ({ analysis, comparisonStyle }) => (
    <div className="build-drif-analysis">
        <section className="build-drif-profile">
            <div className="build-drif-analysis-heading">
                <span>
                    <strong>Profil drifów</strong>
                    <small>Liczba, średni poziom i rozkład rozmiarów</small>
                </span>
            </div>
            <div className="build-drif-profile-grid" style={comparisonStyle}>
                <span />
                {analysis.builds.map((build) => (
                    <strong key={build.id}>
                        {build.name}
                        <small>
                            {build.total} drifów · śr. poz. {formatAverage(build.averageLevel)}
                        </small>
                    </strong>
                ))}
                {DRIF_CATEGORY_ORDER.map((category) => (
                    <div className="build-drif-profile-row" key={category}>
                        <span className="build-drif-profile-label">
                            <CategoryIcon kind="drif" category={category} />
                            <span>
                                <strong>{DRIF_CATEGORY_LABELS[category]}</strong>
                                <small>{CATEGORY_DESCRIPTIONS[category]}</small>
                            </span>
                        </span>
                        {analysis.builds.map((build) => {
                            const summary = build.categories[category];
                            return (
                                <div key={build.id} data-category={category.toLowerCase()}>
                                    <strong>{summary.count}</strong>
                                    <span>śr. poz. {formatAverage(summary.averageLevel)}</span>
                                    <small>
                                        {DRIF_SIZE_ORDER.map((size) => (
                                            <i
                                                className={summary.sizes[size] ? "has-value" : ""}
                                                key={size}
                                                title={size}
                                            >
                                                {DRIF_SIZE_LABELS[size]} {summary.sizes[size]}
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
                    <strong>Część wspólna</strong>
                    <small>Te same drify obecne w każdym porównywanym buildzie</small>
                </span>
                <em>{analysis.common.reduce((sum, entry) => sum + entry.count, 0)}</em>
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
                                <span>{DRIF_CATEGORY_LABELS[category]}</span>
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
                <p className="build-drif-empty">Brak wspólnych drifów we wszystkich buildach.</p>
            )}
        </section>

        <section className="build-drif-unique">
            <div className="build-drif-analysis-heading">
                <span>
                    <strong>Poza wspólną częścią</strong>
                    <small>Drify, którymi buildy różnią się od wspólnej części</small>
                </span>
            </div>
            <div className="build-drif-unique-grid" style={comparisonStyle}>
                {analysis.outsideCommon.map((build) => (
                    <article key={build.id}>
                        <strong>{build.name}</strong>
                        {build.entries.length ? (
                            build.entries.map((entry) => <DrifToken entry={entry} key={entry.id} />)
                        ) : (
                            <small>Brak — build składa się wyłącznie ze wspólnego rdzenia.</small>
                        )}
                    </article>
                ))}
            </div>
        </section>
    </div>
);

const BuildComparison = ({ builds, items = [], drifs = [], gameRules = {} }) => {
    const [activeSection, setActiveSection] = useState("equipment");
    const [onlyDifferences, setOnlyDifferences] = useState(true);
    const equipmentRows = useMemo(
        () => createEquipmentComparisonRows(builds, items),
        [builds, items]
    );
    const statGroups = useMemo(
        () => createStatComparisonGroups(builds, gameRules),
        [builds, gameRules]
    );
    const drifAnalysis = useMemo(
        () => createDrifComposition(builds, drifs, gameRules),
        [builds, drifs, gameRules]
    );
    const comparisonStyle = { "--comparison-columns": builds.length };
    const equipmentDifferenceCount = equipmentRows.filter((row) => row.differs).length;
    const characterDifferenceCount = statGroups.character.filter((row) => row.differs).length;
    const drifDifferenceCount = DRIF_CATEGORY_ORDER.flatMap(
        (category) => statGroups.drifs[category]
    ).filter((row) => row.differs).length;

    if (builds.length < 2)
        return (
            <div className="build-comparison-empty">
                <span aria-hidden="true">⇄</span>
                <strong>Wybierz co najmniej dwa buildy</strong>
                <p>
                    Zaznacz konfiguracje po lewej stronie, aby zestawić ekwipunek, statystyki
                    postaci i drify.
                </p>
            </div>
        );

    const visibleEquipmentRows = equipmentRows.filter((row) => !onlyDifferences || row.differs);
    const characterSections = [
        {
            key: "character",
            title: "Statystyki postaci",
            rows: statGroups.character,
        },
        {
            key: "orbs",
            title: "Bonusy z orbów",
            description: "Oddzielone od wpływu drifów",
            rows: statGroups.orbs,
        },
    ];
    const drifSections = DRIF_CATEGORY_ORDER.map((category) => ({
        key: category,
        category,
        title: `Drify ${DRIF_CATEGORY_LABELS[category].toLocaleLowerCase("pl-PL")}`,
        description: CATEGORY_DESCRIPTIONS[category],
        rows: statGroups.drifs[category],
    }));

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
                                Poziom {summary.level} · {summary.equipped}/12 przedmiotów ·{" "}
                                {summary.drifs} drifów
                            </small>
                        </article>
                    );
                })}
            </div>
            <div className="build-comparison-difference-strip">
                <span>
                    <strong>{equipmentDifferenceCount}</strong> różnych slotów
                </span>
                <span>
                    <strong>{characterDifferenceCount}</strong> różnic postaci
                </span>
                <span>
                    <strong>{drifDifferenceCount}</strong> różnic bonusów drifów
                </span>
                <span>
                    <strong>
                        {drifAnalysis.common.reduce((sum, entry) => sum + entry.count, 0)}
                    </strong>{" "}
                    wspólnych drifów
                </span>
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
                        aria-selected={activeSection === "character"}
                        onClick={() => setActiveSection("character")}
                    >
                        Postać i orby
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeSection === "drifs"}
                        onClick={() => setActiveSection("drifs")}
                    >
                        Drify
                    </button>
                </div>
                <label>
                    <input
                        type="checkbox"
                        checked={onlyDifferences}
                        onChange={(event) => setOnlyDifferences(event.target.checked)}
                    />
                    W tabelach: tylko różnice
                </label>
            </div>

            {activeSection === "equipment" ? (
                <div className="build-comparison-table custom-scrollbar" style={comparisonStyle}>
                    <div className="build-comparison-row build-comparison-header">
                        <span>Slot</span>
                        {builds.map((build) => (
                            <strong key={build.id}>{build.name}</strong>
                        ))}
                    </div>
                    {visibleEquipmentRows.length ? (
                        visibleEquipmentRows.map((row) => (
                            <div className="build-comparison-row" key={row.key}>
                                <span className="build-comparison-label">{row.label}</span>
                                {row.values.map((value, index) => (
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
                                ))}
                            </div>
                        ))
                    ) : (
                        <p className="build-comparison-no-differences">
                            Brak różnic w wybranym zakresie.
                        </p>
                    )}
                </div>
            ) : null}

            {activeSection === "character" ? (
                <StatComparisonTable
                    builds={builds}
                    sections={characterSections}
                    onlyDifferences={onlyDifferences}
                    comparisonStyle={comparisonStyle}
                />
            ) : null}

            {activeSection === "drifs" ? (
                <div className="build-comparison-drif-view custom-scrollbar">
                    <DrifComposition analysis={drifAnalysis} comparisonStyle={comparisonStyle} />
                    <div className="build-drif-result-heading">
                        <strong>Różnica w statystykach</strong>
                    </div>
                    <StatComparisonTable
                        builds={builds}
                        sections={drifSections}
                        onlyDifferences={onlyDifferences}
                        comparisonStyle={comparisonStyle}
                    />
                </div>
            ) : null}

            {activeSection !== "equipment" && builds.some((build) => !build.stats) && (
                <p className="build-comparison-hint">
                    „—” oznacza, że build zapisano bez wcześniejszego przeliczenia statystyk.
                </p>
            )}
        </div>
    );
};

export default BuildComparison;
