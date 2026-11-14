import { useTranslation } from "../i18n/useTranslation";
import "./calculation-cooldown.css";

export default function CalculationCooldownNotice({ seconds, id }) {
    const { t } = useTranslation();
    if (seconds <= 0) return null;
    return (
        <p id={id} className="calculation-cooldown" role="timer" aria-live="off">
            {t("Ponowne uruchomienie za {0} s.", [seconds])}
        </p>
    );
}
