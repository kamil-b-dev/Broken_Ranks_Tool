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
                        className="header-action header-action-primary"
                    >
                        <span aria-hidden="true">↓</span> Zapisz build
                    </button>
                    <button
                        type="button"
                        onClick={() => buildFileInputRef.current?.click()}
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

            {initialDataError && (
                <div
                    role="alert"
                    className="w-full border border-red-900/70 bg-red-950/40 px-4 py-3 text-center text-sm text-red-300 shadow-inner"
                >
                    Nie udało się załadować danych gry: {initialDataError}
                </div>
            )}

            {mainView === "builder" ? (
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
            ) : (
                <OptimizerWorkspace
                    settings={optimizerSettings}
                    onSettingsChange={setOptimizerSettings}
                />
            )}
        </div>
    );
}

export default App;
