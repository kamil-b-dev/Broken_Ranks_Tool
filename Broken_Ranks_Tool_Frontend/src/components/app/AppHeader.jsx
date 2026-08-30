const AppHeader = ({
    activeView,
    disabled,
    fileInputRef,
    onViewChange,
    onSaveBuild,
    onLoadBuild,
}) => (
    <header className="app-masthead shrink-0">
        <div className="brand-lockup">
            <div className="brand-crest" aria-hidden="true">
                BR
            </div>
            <div>
                <h1>Broken Ranks Tool</h1>
                <p className="brand-subtitle">
                    Zbuduj ekwipunek, ustaw drify i sprawdź gotową konfigurację.
                </p>
            </div>
        </div>
        <nav className="main-switch" aria-label="Główne widoki aplikacji">
            <button
                type="button"
                onClick={() => onViewChange("builder")}
                disabled={disabled}
                aria-current={activeView === "builder" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "builder" ? "border-red-700 bg-stone-900/90 text-stone-100 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                Kreator ekwipunku
            </button>
            <button
                type="button"
                onClick={() => onViewChange("optimizer")}
                disabled={disabled}
                aria-current={activeView === "optimizer" ? "page" : undefined}
                className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${activeView === "optimizer" ? "border-purple-500 bg-purple-950/30 text-purple-300 shadow-inner" : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"}`}
            >
                Optymalizator drifów
            </button>
        </nav>
        <div className="header-actions">
            <button
                type="button"
                onClick={onSaveBuild}
                disabled={disabled}
                className="header-action header-action-primary"
            >
                <span aria-hidden="true">↓</span> Zapisz build
            </button>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="header-action"
            >
                <span aria-hidden="true">↑</span> Wczytaj build
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={onLoadBuild}
                className="hidden"
            />
        </div>
    </header>
);

export default AppHeader;
