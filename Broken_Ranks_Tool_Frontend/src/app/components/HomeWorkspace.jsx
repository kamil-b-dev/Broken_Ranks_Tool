import { useTranslation } from "../../shared/i18n/useTranslation";
const HomeWorkspace = () => {
    const { t } = useTranslation();
    return (
        <main id="workspace-content" className="home-workspace">
            <div className="home-hero-art" aria-hidden="true" />
            <div className="home-hero-shade" aria-hidden="true" />
            <section className="home-intro" aria-labelledby="home-title">
                <h2 id="home-title">{t("Broken Ranks Tool")}</h2>
            </section>
        </main>
    );
};

export default HomeWorkspace;
