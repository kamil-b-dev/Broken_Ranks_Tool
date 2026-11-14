import { useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { equipmentWearWarnings } from "./itemPreview";
import { PROFESSIONS } from "../../../shared/domain/characterClasses";
import { useProfession } from "../../../shared/state/ProfessionContext";
import "./item-preview.css";

export default function EquipmentRequirements({ requestData, items, level }) {
    const { t } = useTranslation();
    const [localProfession, setLocalProfession] = useState("AUTO");
    const shared = useProfession();
    const profession = shared?.profession ?? localProfession;
    const setProfession = shared?.setProfession ?? setLocalProfession;
    const warnings = equipmentWearWarnings(requestData, items, level, profession);
    return (
        <div className="equipment-requirements">
            <label className="equipment-profession-control">
                <span className="equipment-profession-label">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <circle cx="12" cy="8" r="3" />
                        <path d="M5 21v-3a7 7 0 0 1 14 0v3" />
                    </svg>
                    {t("Profesja")}
                </span>
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
