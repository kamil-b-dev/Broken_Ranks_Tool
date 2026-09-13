import { useMemo, useState } from "react";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../shared/domain/equipment/drifCategories";
import TabList from "../../shared/ui/TabList";
import {
    createEquipmentComparisonRows,
    summarizeLocalBuild,
} from "./comparison/buildComparisonData";
import { createDrifComposition } from "./comparison/drifComparison";
import { createStatComparisonGroups } from "./comparison/statComparison";
import DrifComposition from "./comparison/DrifComposition";
import StatComparisonTable from "./comparison/StatComparisonTable";
import { CATEGORY_DESCRIPTIONS } from "./comparison/comparisonPresentation";
import EquipmentComparisonTable from "./comparison/EquipmentComparisonTable";

const COMPARISON_TABS = [
    { value: "equipment", label: "Ekwipunek" },
    { value: "character", label: "Postać i orby" },
    { value: "drifs", label: "Drify" },
];

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

    const characterSections = [
        { key: "character", title: "Statystyki postaci", rows: statGroups.character },
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
    const equipmentDifferenceCount = equipmentRows.filter((row) => row.differs).length;
    const characterDifferenceCount = statGroups.character.filter((row) => row.differs).length;
    const drifDifferenceCount = DRIF_CATEGORY_ORDER.flatMap(
        (category) => statGroups.drifs[category]
    ).filter((row) => row.differs).length;

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
                <TabList
                    label="Zakres porównania buildów"
                    idPrefix="build-comparison"
                    tabs={COMPARISON_TABS}
                    active={activeSection}
                    onChange={setActiveSection}
                />
                <label>
                    <input
                        type="checkbox"
                        checked={onlyDifferences}
                        onChange={(event) => setOnlyDifferences(event.target.checked)}
                    />
                    W tabelach: tylko różnice
                </label>
            </div>

            <EquipmentComparisonTable
                active={activeSection === "equipment"}
                builds={builds}
                rows={equipmentRows}
                onlyDifferences={onlyDifferences}
                comparisonStyle={comparisonStyle}
            />

            <div
                id="build-comparison-panel-character"
                role="tabpanel"
                aria-labelledby="build-comparison-tab-character"
                tabIndex={0}
                hidden={activeSection !== "character"}
            >
                <StatComparisonTable
                    builds={builds}
                    sections={characterSections}
                    onlyDifferences={onlyDifferences}
                    comparisonStyle={comparisonStyle}
                />
            </div>

            <div
                id="build-comparison-panel-drifs"
                role="tabpanel"
                aria-labelledby="build-comparison-tab-drifs"
                tabIndex={0}
                hidden={activeSection !== "drifs"}
                className="build-comparison-drif-view custom-scrollbar"
            >
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

            {activeSection !== "equipment" && builds.some((build) => !build.stats) && (
                <p className="build-comparison-hint">
                    „—” oznacza, że build zapisano bez wcześniejszego przeliczenia statystyk.
                </p>
            )}
        </div>
    );
};

export default BuildComparison;
