import { useState } from "react";
import { useEquipment } from "../../../shared/state/EquipmentContext";
import TabList from "../../../shared/ui/TabList";
import { buildStatColumns } from "../stats-panel/statsPanelDomain";

export default function MobileStatsPanel() {
    const equipment = useEquipment();
    const columns = buildStatColumns(equipment);
    const [activeView, setActiveView] = useState("all");
    const visibleColumns = columns.filter((column) => {
        if (activeView === "all") return true;
        if (activeView === "basic") return column.title === "Statystyki podstawowe";
        if (activeView === "orbs") return column.title === "Orby";
        return column.title === "Drify";
    });
    return (
        <section className="mobile-stats" aria-label="Statystyki buildu">
            <button
                type="button"
                className="mobile-primary"
                disabled={equipment.isCalculatingStats}
                onClick={equipment.calculateStats}
            >
                {equipment.isCalculatingStats ? "Przeliczanie…" : "Przelicz statystyki"}
            </button>
            {!equipment.stats && (
                <p className="mobile-muted">Przelicz statystyki aktualnego ekwipunku i postaci.</p>
            )}
            {columns.length > 0 && (
                <>
                    <TabList
                        className="stats-result-tabs"
                        label="Zakres wyświetlanych statystyk"
                        idPrefix="mobile-stats-result"
                        panelId="mobile-stats-result-panel"
                        active={activeView}
                        onChange={setActiveView}
                        tabs={[
                            { value: "all", label: "Wszystkie" },
                            { value: "basic", label: "Bazowe" },
                            { value: "orbs", label: "Orby" },
                            { value: "drifs", label: "Drify" },
                        ]}
                    />
                    <div
                        className="mobile-stats-results"
                        id="mobile-stats-result-panel"
                        role="tabpanel"
                        aria-labelledby={`mobile-stats-result-tab-${activeView}`}
                    >
                        {visibleColumns.map((column) => (
                            <section className="mobile-card" key={column.title}>
                                <h2>{column.title}</h2>
                                {column.categories.map(({ category, values }) => (
                                    <div key={category.title}>
                                        <h3>{category.title}</h3>
                                        <dl>
                                            {values.map(({ key, val, displayName }) => (
                                                <div key={key}>
                                                    <dt>{displayName}</dt>
                                                    <dd>{val}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
