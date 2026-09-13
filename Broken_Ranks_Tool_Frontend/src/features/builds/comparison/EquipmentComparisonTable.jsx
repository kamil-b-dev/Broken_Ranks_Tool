const EquipmentComparisonTable = ({ active, builds, rows, onlyDifferences, comparisonStyle }) => {
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
                <span>Slot</span>
                {builds.map((build) => (
                    <strong key={build.id}>{build.name}</strong>
                ))}
            </div>
            {visibleRows.length ? (
                visibleRows.map((row) => (
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
                <p className="build-comparison-no-differences">Brak różnic w wybranym zakresie.</p>
            )}
        </div>
    );
};

export default EquipmentComparisonTable;
