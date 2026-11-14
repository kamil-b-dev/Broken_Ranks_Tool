import { useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { equipmentWearWarnings } from "./itemPreview";
import { PROFESSIONS } from "../../../shared/domain/characterClasses";
import "./item-preview.css";

export default function EquipmentRequirements({ requestData, items, level }) {
    const { t } = useTranslation();
    const [profession, setProfession] = useState("AUTO");
    const warnings = equipmentWearWarnings(requestData, items, level, profession);
    return (
        <div className="equipment-requirements">
            <label>
                {t("Profesja do sprawdzenia wymagań")}
                <select value={profession} onChange={(event) => setProfession(event.target.value)}>
                    <option value="AUTO">{t("Automatycznie z broni")}</option>
                    {Object.entries(PROFESSIONS).map(([value, label]) => (
                        <option key={value} value={value}>
                            {t(label)}
                        </option>
                    ))}
                </select>
            </label>
            {warnings.length > 0 && (
                <ul role="status">
                    {warnings.map((warning, index) => (
                        <li key={index}>
                            {warning.name}:{" "}
                            {warning.reason === "level"
                                ? `${t("wymagany poziom")} ${warning.required}`
                                : t("przedmiot nie pasuje do wybranej profesji")}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
