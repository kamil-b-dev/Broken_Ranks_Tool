export default function BuilderEquipmentViewSwitch({ view, onChange }) {
    return (
        <div className="builder-equipment-view-switch" role="group" aria-label="Widok ekwipunku">
            {[
                ["character", "Postać"],
                ["backpack", "Plecak W.I.P"],
            ].map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={view === key}
                    onClick={() => onChange(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
