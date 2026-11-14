import { useTranslation } from "../../shared/i18n/useTranslation";
import "./project-footer.css";

const repository = "https://github.com/kamil-b-dev/Broken_Ranks_Tool";

export default function ProjectFooter() {
    const { t } = useTranslation();
    return (
        <footer className="project-footer">
            <nav aria-label={t("Informacje o projekcie")}>
                <a
                    href={`${repository}/issues/new?template=bug_report.yml`}
                    target="_blank"
                    rel="noreferrer"
                >
                    {t("Zgłoś błąd")}
                </a>
                <a href={repository} target="_blank" rel="noreferrer">
                    {t("Kod źródłowy")}
                </a>
                <a href={`${repository}/blob/master/LICENSE`} target="_blank" rel="noreferrer">
                    {t("Licencja AGPL-3.0")}
                </a>
            </nav>
            <details>
                <summary>{t("O projekcie i danych")}</summary>
                <div className="project-footer-details">
                    <p>
                        {t(
                            "Broken Ranks Tool to nieoficjalny projekt fanowski autorstwa kamil-b-dev, niezwiązany z Whitemoon Games. Nazwa Broken Ranks oraz materiały gry należą do ich właścicieli."
                        )}
                    </p>
                    <h2>{t("Dane w przeglądarce")}</h2>
                    <p>
                        {t(
                            "Buildy, plecak, roboczy szkic, postęp i ustawienia są zapisywane lokalnie w tej przeglądarce. Usunięcie danych witryny usuwa te zapisy. Inne urządzenie lub adres strony ma osobny magazyn danych."
                        )}
                    </p>
                    <p>
                        {t(
                            "Przed zmianą przeglądarki lub usunięciem danych pobierz bibliotekę w widoku Buildy lokalne. Kopia obejmuje zapisane buildy i ich plecaki; nie obejmuje roboczego szkicu ani lokalnego postępu planera. Najpierw zapisz szkic jako build, a projekt ścieżki pobierz osobno w widoku Rozwój."
                        )}
                    </p>
                    <h2>{t("Obliczenia i hosting")}</h2>
                    <p>
                        {t(
                            "Dane potrzebne do obliczeń są wysyłane do API aplikacji. Serwer nie prowadzi kont użytkowników ani biblioteki ich buildów. Hosting Railway obsługuje połączenia i może przetwarzać dane techniczne, w tym adres IP, w swoich logach."
                        )}
                    </p>
                    <a href="https://railway.com/legal/privacy" target="_blank" rel="noreferrer">
                        {t("Prywatność hostingu Railway")}
                    </a>
                    <h2>{t("Kontakt i zgłoszenia")}</h2>
                    <p>
                        {t(
                            "Błędy i pytania zgłaszaj w GitHub Issues. Zgłoszenia są publiczne; dołączaj tylko dane, które chcesz udostępnić. Podatności zgłaszaj prywatnie przez zakładkę Security repozytorium."
                        )}
                    </p>
                    <a
                        href={`${repository}/security/advisories/new`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t("Zgłoś podatność prywatnie")}
                    </a>
                </div>
            </details>
        </footer>
    );
}
