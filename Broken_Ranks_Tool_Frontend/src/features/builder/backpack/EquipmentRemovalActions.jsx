import { useTranslation } from "../../../shared/i18n/useTranslation";
import EquipmentRemovalAction from "./EquipmentRemovalAction";

export default function EquipmentRemovalActions({ actions }) {
    const { t } = useTranslation();

    if (!actions) return null;
    return (
        <div
            className="equipment-removal-actions"
            aria-label={t("Przenieś wyposażenie do plecaka")}
        >
            {[
                ["ITEM", "Zdejmij wszystkie przedmioty"],
                ["ORB", "Zdejmij wszystkie orby"],
                ["DRIF", "Zdejmij wszystkie drify"],
            ].map(([kind, label]) => (
                <EquipmentRemovalAction key={kind} actions={actions} kind={kind} label={t(label)} />
            ))}
        </div>
    );
}
