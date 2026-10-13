import EquipmentRemovalAction from "./EquipmentRemovalAction";

export default function EquipmentRemovalActions({ actions }) {
    if (!actions) return null;
    return (
        <div className="equipment-removal-actions" aria-label="Przenieś wyposażenie do plecaka">
            {[
                ["ITEM", "Zdejmij wszystkie przedmioty"],
                ["ORB", "Zdejmij wszystkie orby"],
                ["DRIF", "Zdejmij wszystkie drify"],
            ].map(([kind, label]) => (
                <EquipmentRemovalAction key={kind} actions={actions} kind={kind} label={label} />
            ))}
        </div>
    );
}
