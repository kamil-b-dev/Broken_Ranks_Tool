import { useTranslation } from "../../../shared/i18n/useTranslation";
import "../stats-panel/stats-panel.css";
import { memo, useMemo, useState } from "react";
import {
    useEquipmentCalculation,
    useEquipmentCatalogState,
} from "../../../shared/state/EquipmentContext";
import TabList from "../../../shared/ui/TabList";
import { buildStatColumns } from "../stats-panel/statsPanelDomain";
import { useStatExplanation } from "../stats-panel/useStatExplanation";
import StatExplanationDialog from "../stats-panel/StatExplanationDialog";

function MobileStatsPanel({ requestData }) {
    const { t, locale } = useTranslation();

    const equipment = { ...useEquipmentCalculation(), ...useEquipmentCatalogState() };
    const { stats, gameRules, statSources } = equipment;
    const explanation = useStatExplanation(requestData, gameRules, equipment.data);
    const columns = useMemo(
        () => buildStatColumns({ stats, gameRules, statSources, translateLabel: t, locale }),
        [stats, gameRules, statSources, t, locale]
    );
    const [activeView, setActiveView] = useState("all");
    const visibleColumns = columns.filter((column) => {
        if (activeView === "all") return true;
        if (activeView === "basic") return column.title === "Statystyki podstawowe";
        if (activeView === "orbs") return column.title === "Orby";
        return column.title === "Drify";
    });
    return (
        <section className="mobile-stats" aria-label={t("Statystyki buildu")}>
            <button
                type="button"
                className="mobile-primary"
                disabled={equipment.isCalculatingStats}
                onClick={equipment.calculateStats}
            >
                {t(equipment.isCalculatingStats ? "Przeliczanie…" : "Przelicz statystyki")}
            </button>
            {!equipment.stats && (
                <p className="mobile-muted">
                    {t("Przelicz statystyki aktualnego ekwipunku i postaci.")}
                </p>
            )}
            {columns.length > 0 && (
                <>
                    <TabList
                        className="stats-result-tabs"
                        label={t("Zakres wyświetlanych statystyk")}
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
                                <h2>{t(column.title)}</h2>
                                {column.categories.map(({ category, values }) => (
                                    <div key={category.title}>
                                        <h3>{t(category.title)}</h3>
                                        <ul className="stat-mobile-list">
                                            {values.map(({ key, val, displayName }) => (
                                                <li key={key}>
                                                    <button
                                                        type="button"
                                                        className="stat-explain-trigger"
                                                        disabled={equipment.isCalculatingStats}
                                                        aria-haspopup="dialog"
                                                        aria-label={`${t(displayName)} ${t(val)}`}
                                                        onClick={(event) =>
                                                            explanation.open?.(
                                                                key,
                                                                event.currentTarget
                                                            )
                                                        }
                                                    >
                                                        <span>{t(displayName)}</span>{" "}
                                                        <strong>{t(val)}</strong>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                </>
            )}
            {explanation.selected && (
                <StatExplanationDialog model={explanation} gameRules={gameRules} />
            )}
        </section>
    );
}
export default memo(MobileStatsPanel);
