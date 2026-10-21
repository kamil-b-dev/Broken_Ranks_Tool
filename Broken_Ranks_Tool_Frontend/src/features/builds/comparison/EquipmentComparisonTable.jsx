import { useTranslation } from "../../../shared/i18n/useTranslation";
const EquipmentComparisonTable = ({ active, builds, rows, onlyDifferences, comparisonStyle }) => {
    const { t } = useTranslation();

    const visibleRows = rows.filter((row) => !onlyDifferences || row.differs);

    return (
        <div
            id="build-comparison-panel-equipment"
            role="tabpanel"
            aria-labelledby="build-comparison-tab-equipment"
            tabIndex={0}
            hidden={!active}
            className="build-comparison-table custom-scrollbar"
            style={comparisonStyle}
        >
            <div className="build-comparison-row build-comparison-header">
                <span>{t("Slot")}</span>
                {builds.map((build) => (
                    <strong key={build.id}>{build.name}</strong>
                ))}
            </div>
            {visibleRows.length ? (
                visibleRows.map((row) => (
                    <div className="build-comparison-row" key={row.key}>
                        <span className="build-comparison-label">{t(row.label)}</span>
                        {row.values.map((value, index) => (
                            <div
                                key={`${builds[index].id}-${row.key}`}
                                className={row.differs ? "is-different" : ""}
                            >
                                <strong>{t(value.itemName)}</strong>
                                {value.itemName !== "Pusty slot" && (
                                    <small>
                                        {t(value.tier ? `Tier ${value.tier} · ` : "")}
                                        {t(value.stars > 0 ? `${value.stars}★ · ` : "")}
                                        {t(value.drifCount)}
                                        {t(" drif · ")}
                                        {t(value.orbCount)}
                                        {t(" orb")}
                                    </small>
                                )}
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <p className="build-comparison-no-differences">
                    {t("Brak różnic w wybranym zakresie.")}
                </p>
            )}
        </div>
    );
};

export default EquipmentComparisonTable;
