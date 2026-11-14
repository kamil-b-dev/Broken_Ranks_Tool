import { useTranslation } from "../../shared/i18n/useTranslation";
import "./project-footer.css";

const repository = "https://github.com/kamil-b-dev/Broken_Ranks_Tool";

const FooterIcon = ({ children }) => (
    <svg
        className="project-footer-icon"
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        {children}
    </svg>
);

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
                    <FooterIcon>
                        <rect x="7" y="7" width="10" height="13" rx="5" />
                        <path d="M9 7V5a3 3 0 0 1 6 0v2M3 10h4m10 0h4M3 16h4m10 0h4M12 12v8" />
                    </FooterIcon>
                    <span>{t("Zgłoś błąd")}</span>
                </a>
                <a href={repository} target="_blank" rel="noreferrer">
                    <FooterIcon>
                        <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16" />
                    </FooterIcon>
                    <span>{t("Kod źródłowy")}</span>
                </a>
                <a href={`${repository}/blob/master/LICENSE`} target="_blank" rel="noreferrer">
                    <FooterIcon>
                        <path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h6" />
                    </FooterIcon>
                    <span>{t("Licencja AGPL-3.0")}</span>
                </a>
            </nav>
            <details>
                <summary>
                    <FooterIcon>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v6m0-10v.01" />
                    </FooterIcon>
                    <span>{t("O projekcie i danych")}</span>
                    <svg
                        className="project-footer-chevron"
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                    >
                        <path d="m4 6 4 4 4-4" />
                    </svg>
                </summary>
                <div className="project-footer-details">
                    <p className="project-footer-intro">
                        {t(
                            "Broken Ranks Tool to nieoficjalny projekt fanowski autorstwa kamil-b-dev, niezwiązany z Whitemoon Games. Nazwa Broken Ranks oraz materiały gry należą do ich właścicieli."
                        )}
                    </p>
                    <div className="project-footer-sections">
                        <section>
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
                        </section>
                        <section>
                            <h2>{t("Obliczenia i hosting")}</h2>
                            <p>
                                {t(
                                    "Dane potrzebne do obliczeń są wysyłane do API aplikacji. Serwer nie prowadzi kont użytkowników ani biblioteki ich buildów. Hosting Railway obsługuje połączenia i może przetwarzać dane techniczne, w tym adres IP, w swoich logach."
                                )}
                            </p>
                            <a
                                href="https://railway.com/legal/privacy"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {t("Prywatność hostingu Railway")}
                            </a>
                        </section>
                        <section>
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
                        </section>
                    </div>
                </div>
            </details>
        </footer>
    );
}
