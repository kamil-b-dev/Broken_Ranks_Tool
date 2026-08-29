import { useRef, useState } from "react";
import BuilderWorkspace from "./components/workspaces/BuilderWorkspace";
import OptimizerWorkspace from "./components/workspaces/OptimizerWorkspace";
import { useEquipment } from "./context/EquipmentContext";

/**
 * Root application component responsible for top-level navigation.
 * Provides the global builder and optimizer view switch.
 *
 * @returns {JSX.Element} The rendered application view.
 */
function App() {
    const [mainView, setMainView] = useState("builder");
    const [buildFileNotice, setBuildFileNotice] = useState(null);
    const [optimizerSettings, setOptimizerSettings] = useState({
        forceMaximizationByDrifBonus: false,
        generateVariants: false,
        maxVariantLossPercent: 5,
    });

    const {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        loading,
        initialDataError,
        requestData,
        stats,
        statSources,
        isCalculatingStats,
        optimizationTrigger,
        characterConfig,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        calculateStats,
        saveBuildToFile,
        loadBuildFromFile,
    } = useEquipment();
    const buildFileInputRef = useRef(null);
    const isWorkspaceUnavailable = loading || Boolean(initialDataError);

    const handleSaveBuild = () => {
        try {
            saveBuildToFile();
            setBuildFileNotice({
                type: "success",
                message: "Build został zapisany w pliku JSON.",
            });
        } catch (error) {
            setBuildFileNotice({
                type: "error",
                message: `Nie udało się zapisać buildu: ${error.message}`,
            });
        }
    };

    const handleBuildFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await loadBuildFromFile(file);
            setBuildFileNotice({
                type: "success",
                message: `Wczytano build z pliku ${file.name}.`,
            });
        } catch (error) {
            setBuildFileNotice({
                type: "error",
                message: `Nie udało się wczytać buildu: ${error.message}`,
            });
        } finally {
            event.target.value = "";
        }
    };

    return (
        <div
            className={`app-shell app-shell-${mainView} mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 p-4 md:p-6 xl:gap-5 xl:p-8`}
        >
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
                        onClick={() => setMainView("builder")}
                        disabled={isWorkspaceUnavailable}
                        aria-current={mainView === "builder" ? "page" : undefined}
                        className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "builder"
                                ? "border-red-700 bg-stone-900/90 text-stone-100 shadow-inner"
                                : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"
                        }`}
                    >
                        Kreator ekwipunku
                    </button>
                    <button
                        type="button"
                        onClick={() => setMainView("optimizer")}
                        disabled={isWorkspaceUnavailable}
                        aria-current={mainView === "optimizer" ? "page" : undefined}
                        className={`flex-1 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "optimizer"
                                ? "border-purple-500 bg-purple-950/30 text-purple-300 shadow-inner"
                                : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-200"
                        }`}
                    >
                        Optymalizator drifów
                    </button>
                </nav>

                <div className="header-actions">
                    <button
                        type="button"
                        onClick={handleSaveBuild}
                        disabled={isWorkspaceUnavailable}
                        className="header-action header-action-primary"
                    >
                        <span aria-hidden="true">↓</span> Zapisz build
                    </button>
                    <button
                        type="button"
                        onClick={() => buildFileInputRef.current?.click()}
                        disabled={isWorkspaceUnavailable}
                        className="header-action"
                    >
                        <span aria-hidden="true">↑</span> Wczytaj build
                    </button>
                    <input
                        ref={buildFileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleBuildFileChange}
                        className="hidden"
                    />
                </div>
            </header>

            {buildFileNotice && (
                <div
                    className={`build-file-notice build-file-notice-${buildFileNotice.type}`}
                    role={buildFileNotice.type === "error" ? "alert" : "status"}
                >
                    <span aria-hidden="true">{buildFileNotice.type === "error" ? "!" : "✓"}</span>
                    <p>{buildFileNotice.message}</p>
                    <button
                        type="button"
                        onClick={() => setBuildFileNotice(null)}
                        aria-label="Zamknij komunikat"
                    >
                        ×
                    </button>
                </div>
            )}

            {loading && (
                <section className="workspace-state" role="status" aria-live="polite">
                    <span className="workspace-state-spinner" aria-hidden="true" />
                    <div>
                        <p className="section-kicker">Przygotowanie warsztatu</p>
                        <h2>Ładowanie danych gry</h2>
                        <p>Pobieramy przedmioty, orby, drify i reguły wymagane przez kalkulator.</p>
                    </div>
                </section>
            )}

            {!loading && initialDataError && (
                <div role="alert" className="workspace-state workspace-state-error">
                    <span aria-hidden="true">!</span>
                    <div>
                        <p className="section-kicker">Brak danych źródłowych</p>
                        <h2>Nie udało się uruchomić kalkulatora</h2>
                        <p>{initialDataError}</p>
                    </div>
                </div>
            )}

            {!isWorkspaceUnavailable && mainView === "builder" ? (
                <BuilderWorkspace
                    data={data}
                    categoryNames={categoryNames}
                    orbCategories={orbCategories}
                    drifCategories={drifCategories}
                    gameRules={gameRules}
                    requestData={requestData}
                    stats={stats}
                    statSources={statSources}
                    isCalculatingStats={isCalculatingStats}
                    optimizationTrigger={optimizationTrigger}
                    characterConfig={characterConfig}
                    onSlotUpdate={handleSlotUpdate}
                    onCharacterStatsUpdate={handleCharacterStatsUpdate}
                    onCalculateStats={calculateStats}
                />
            ) : !isWorkspaceUnavailable ? (
                <OptimizerWorkspace
                    settings={optimizerSettings}
                    onSettingsChange={setOptimizerSettings}
                />
            ) : null}
        </div>
    );
}

export default App;
