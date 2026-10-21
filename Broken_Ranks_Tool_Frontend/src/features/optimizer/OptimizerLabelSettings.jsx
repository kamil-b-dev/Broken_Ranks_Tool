import { useTranslation } from "../../shared/i18n/useTranslation";
import { useOptimizerLabels } from "./useOptimizerLabels";

export default function OptimizerLabelSettings() {
    const { t } = useTranslation();

    const labels = useOptimizerLabels();
    return (
        <label className="optimizer-label-setting">
            {t("Nazwy modów")}
            <select
                aria-label={t("Nazwy modów")}
                value={labels.mode}
                onChange={(event) => labels.changeMode(event.target.value)}
            >
                <option value="MODIFIERS">{t("Opis bonusu")}</option>
                <option value="DRIFS">{t("Nazwa drifa")}</option>
            </select>
        </label>
    );
}
