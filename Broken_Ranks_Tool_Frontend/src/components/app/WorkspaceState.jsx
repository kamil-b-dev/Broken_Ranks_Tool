const WorkspaceState = ({ loading, error }) => {
    if (loading) return <section id="workspace-content" className="workspace-state" role="status" aria-live="polite"><span className="workspace-state-spinner" aria-hidden="true" /><div><p className="section-kicker">Przygotowanie warsztatu</p><h2>Ładowanie danych gry</h2><p>Pobieramy przedmioty, orby, drify i reguły wymagane przez kalkulator.</p></div></section>;
    if (error) return <div id="workspace-content" role="alert" className="workspace-state workspace-state-error"><span aria-hidden="true">!</span><div><p className="section-kicker">Brak danych źródłowych</p><h2>Nie udało się uruchomić kalkulatora</h2><p>{error}</p></div></div>;
    return null;
};

export default WorkspaceState;
