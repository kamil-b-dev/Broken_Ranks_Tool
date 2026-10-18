import { Component } from "react";
import { LanguageContext } from "../shared/i18n/LanguageContext";
import { translate } from "../shared/i18n/translation";

/** Keeps an unexpected render failure from leaving an empty page. */
class AppErrorBoundary extends Component {
    static contextType = LanguageContext;
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, details) {
        console.error("Nieobsłużony błąd interfejsu:", error, details);
    }

    render() {
        const t = (source) => translate(source, this.context.language);
        if (!this.state.failed) return this.props.children;
        return (
            <main className="workspace-state workspace-state-error" role="alert">
                <strong>{t("Nie udało się wyświetlić aplikacji")}</strong>
                <p>
                    {t("Odśwież stronę. Niezapisane zmiany bieżącego buildu mogą zostać utracone.")}
                </p>
                <button type="button" onClick={() => window.location.reload()}>
                    {t("Odśwież aplikację")}
                </button>
            </main>
        );
    }
}

export default AppErrorBoundary;
