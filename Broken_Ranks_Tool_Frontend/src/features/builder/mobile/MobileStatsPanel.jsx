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
import StatRows from "../stats-panel/StatRows";

function MobileStatsPanel({ requestData }) {
    const { t, locale } = useTranslation();

    const equipment = { ...useEquipmentCalculation(), ...useEquipmentCatalogState() };
    const { stats, gameRules, statSources } = equipment;
    const explanation = useStatExplanation(requestData, gameRules, equipment.data);
    const columns = useMemo(
        () =>
            buildStatColumns({
                stats,
                gameRules,
                statSources,
                translateLabel: t,
                locale,
                requestData,
                catalog: equipment.data,
            }),
        [stats, gameRules, statSources, t, locale, requestData, equipment.data]
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
                                        <StatRows
                                            values={values}
                                            onExplain={explanation.open}
                                            disabled={equipment.isCalculatingStats}
                                        />
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
