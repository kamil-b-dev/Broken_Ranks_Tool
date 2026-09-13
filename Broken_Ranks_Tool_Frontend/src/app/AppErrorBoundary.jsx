import { Component } from "react";

/** Keeps an unexpected render failure from leaving an empty page. */
class AppErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error, details) {
        console.error("Nieobsłużony błąd interfejsu:", error, details);
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <main className="workspace-state workspace-state-error" role="alert">
                <strong>Nie udało się wyświetlić aplikacji</strong>
                <p>Odśwież stronę. Niezapisane zmiany bieżącego buildu mogą zostać utracone.</p>
                <button type="button" onClick={() => window.location.reload()}>
                    Odśwież aplikację
                </button>
            </main>
        );
    }
}

export default AppErrorBoundary;
