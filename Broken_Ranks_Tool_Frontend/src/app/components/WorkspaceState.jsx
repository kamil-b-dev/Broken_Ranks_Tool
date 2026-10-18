import { useTranslation } from "../../shared/i18n/useTranslation";
const WorkspaceState = ({ loading, error }) => {
    const { t } = useTranslation();

    if (loading)
        return (
            <section
                id="workspace-content"
                className="workspace-state"
                role="status"
                aria-live="polite"
            >
                <span className="workspace-state-spinner" aria-hidden="true" />
                <div>
                    <p className="section-kicker">{t("Przygotowanie warsztatu")}</p>
                    <h2>{t("Ładowanie danych gry")}</h2>
                    <p>
                        {t("Pobieramy przedmioty, orby, drify i reguły wymagane przez kalkulator.")}
                    </p>
                </div>
            </section>
        );
    if (error)
        return (
            <div
                id="workspace-content"
                role="alert"
                className="workspace-state workspace-state-error"
            >
                <span aria-hidden="true">!</span>
                <div>
                    <p className="section-kicker">{t("Brak danych źródłowych")}</p>
                    <h2>{t("Nie udało się uruchomić kalkulatora")}</h2>
                    <p>{t(error)}</p>
                </div>
            </div>
        );
    return null;
};

export default WorkspaceState;
