import { useTranslation } from "../../shared/i18n/useTranslation";
import "./home-actions.css";

const HomeWorkspace = ({
    mobile = false,
    builds = [],
    hasWorkingBuild = false,
    disabled = false,
    onContinue,
    onImport,
    onOpenBuild,
    onOpenLibrary,
    onOpenProgression,
}) => {
    const { t, locale } = useTranslation();
    const Heading = mobile ? "h1" : "h2";
    const recent = [...builds]
        .sort(
            (left, right) =>
                (Date.parse(right.updatedAt || right.savedAt) || 0) -
                (Date.parse(left.updatedAt || left.savedAt) || 0)
        )
        .slice(0, 3);
    return (
        <main
            id="workspace-content"
            className={mobile ? "mobile-home home-actions-mobile" : "home-workspace"}
        >
            {!mobile && (
                <>
                    <div className="home-hero-art" aria-hidden="true" />
                    <div className="home-hero-shade" aria-hidden="true" />
                </>
            )}
            <section className="home-intro" aria-labelledby="home-title">
                <Heading id="home-title">{t("Broken Ranks Tool")}</Heading>
                <div className="home-actions">
                    <button type="button" onClick={onContinue} disabled={disabled}>
                        {t(hasWorkingBuild ? "Kontynuuj build" : "Utwórz build")}
                    </button>
                    <button type="button" onClick={onImport} disabled={disabled}>
                        {t("Importuj build")}
                    </button>
                    <button type="button" onClick={onOpenProgression} disabled={disabled}>
                        {t("Zaplanuj rozwój")}
                    </button>
                </div>
                <section className="home-recent" aria-labelledby="home-recent-title">
                    <div className="home-recent-heading">
                        <h3 id="home-recent-title">{t("Ostatnio zapisane buildy")}</h3>
                        <button type="button" onClick={onOpenLibrary}>
                            {t("Otwórz bibliotekę")}
                        </button>
                    </div>
                    {recent.length ? (
                        <ul>
                            {recent.map((build) => {
                                const date = new Date(build.updatedAt || build.savedAt);
                                return (
                                    <li key={build.id}>
                                        <span>
                                            <strong>{build.name}</strong>
                                            {Number.isFinite(date.getTime()) && (
                                                <time dateTime={date.toISOString()}>
                                                    {date.toLocaleString(locale, {
                                                        dateStyle: "short",
                                                        timeStyle: "short",
                                                    })}
                                                </time>
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => onOpenBuild(build.id)}
                                            aria-label={t("Otwórz build: {0}", [build.name])}
                                        >
                                            {t("Otwórz")}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p>{t("Nie masz jeszcze zapisanych buildów.")}</p>
                    )}
                </section>
            </section>
        </main>
    );
};

export default HomeWorkspace;
