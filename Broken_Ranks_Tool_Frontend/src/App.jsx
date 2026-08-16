import { useState, useMemo, useRef } from "react";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";
import OptimizerPanel from "./components/OptimizerPanel";
import { useEquipment } from "./context/EquipmentContext";
import { SLOTS } from "./constants/equipment";

/**
 * Root application component responsible for top-level navigation.
 * Provides the global builder and optimizer view switch.
 *
 * @returns {JSX.Element} The rendered application view.
 */
function App() {
    const [mainView, setMainView] = useState("builder");
    const [builderTab, setBuilderTab] = useState("database");

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
        loadBuildFromFile
    } = useEquipment();
    const buildFileInputRef = useRef(null);

    const handleBuildFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            await loadBuildFromFile(file);
            alert("Build został poprawnie wczytany.");
        } catch (error) {
            alert(`Nie udało się wczytać buildu: ${error.message}`);
        } finally {
            event.target.value = "";
        }
    };

    const itemsBySlot = useMemo(() => {
        const grouped = {};
        if (!data?.items) return grouped;

        SLOTS.forEach(slot => {
            grouped[slot.key] = data.items.filter(i =>
                Array.isArray(slot.cat)
                    ? slot.cat.includes(i.category?.toUpperCase())
                    : i.category?.toUpperCase() === slot.cat
            );
        });
        return grouped;
    }, [data.items]);

    return (
        <div className="app-shell w-full max-w-[1920px] mx-auto p-4 md:p-6 xl:p-8 flex flex-col gap-6 xl:gap-8 min-h-screen">

            <header className="app-masthead shrink-0">
                <div className="brand-lockup">
                    <div className="brand-crest" aria-hidden="true">BR</div>
                    <div>
                        <h1>Broken Ranks Tool</h1>
                        <p className="brand-subtitle">Zbuduj ekwipunek, ustaw drify i sprawdź gotową konfigurację.</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        onClick={saveBuildToFile}
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

            <div className="shrink-0">
                <div className="main-switch flex w-full max-w-2xl mx-auto">
                    <button
                        onClick={() => setMainView("builder")}
                        className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "builder"
                                ? "bg-stone-900/90 border-b-2 border-red-700 text-stone-100 shadow-inner"
                                : "text-stone-500 hover:text-stone-200 hover:bg-stone-900/50 border-b-2 border-transparent"
                        }`}
                    >
                        <span className="block text-[10px] tracking-[0.25em] text-red-800 mb-0.5">I</span>
                        Kreator ekwipunku
                    </button>
                    <button
                        onClick={() => setMainView("optimizer")}
                        className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "optimizer"
                                ? "bg-purple-950/30 border-b-2 border-purple-500 text-purple-300 shadow-inner"
                                : "text-stone-500 hover:text-stone-200 hover:bg-stone-900/50 border-b-2 border-transparent"
                        }`}
                    >
                        <span className="block text-[10px] tracking-[0.25em] text-purple-800 mb-0.5">II</span>
                        Optymalizator drifów
                    </button>
                </div>
            </div>

            {initialDataError && (
                <div role="alert" className="w-full border border-red-900/70 bg-red-950/40 px-4 py-3 text-center text-sm text-red-300 shadow-inner">
                    Nie udało się załadować danych gry: {initialDataError}
                </div>
            )}

            <div className={`flex-1 w-full flex-col ${mainView === "builder" ? "flex" : "hidden"}`}>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 flex-1">
                    <section className="workbench xl:col-span-8 p-5 md:p-6 xl:p-8 flex flex-col">
                        <div className="workbench-heading">
                            <div>
                                <p className="section-kicker">Konfiguracja</p>
                                <h2>Ekwipunek</h2>
                            </div>
                            <p className="workbench-help">Wybierz przedmiot lub przeciągnij go z bazy. Złota obwódka oznacza aktywne pole.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 xl:gap-6 pt-2 pb-3">
                            {SLOTS.map((slot) => (
                                <GearSlot
                                    key={slot.key}
                                    slotKey={slot.key}
                                    label={slot.label}
                                    items={itemsBySlot[slot.key] || []}
                                    orbs={data.orbs}
                                    drifs={data.drifs}
                                    allSlots={requestData.slots || {}}
                                    onUpdate={handleSlotUpdate}
                                    gameRules={gameRules}
                                    optimizationTrigger={optimizationTrigger}
                                />
                            ))}
                        </div>
                    </section>

                    <div className="xl:col-span-4 flex flex-col gap-4 relative min-h-[600px] xl:min-h-0">
                        <div className="flex bg-black/60 p-1 border border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)] shrink-0">
                            <button
                                onClick={() => setBuilderTab("database")}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                    builderTab === "database"
                                        ? "bg-stone-800 border-b-2 border-stone-400 text-stone-200"
                                        : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                                }`}
                            >
                                Baza Przedmiotów
                            </button>
                            <button
                                onClick={() => setBuilderTab("character")}
                                className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                    builderTab === "character"
                                        ? "bg-amber-950/40 border-b-2 border-amber-700 text-amber-500"
                                        : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                                }`}
                            >
                                Statystyki Postaci
                            </button>
                        </div>

                        <div className="relative flex-1">
                            <div className={`xl:absolute xl:inset-0 flex flex-col w-full h-full ${builderTab === "database" ? "flex" : "hidden"}`}>
                                <ItemDatabase
                                    items={data.items}
                                    orbs={data.orbs}
                                    drifs={data.drifs}
                                    categoryNames={categoryNames}
                                    orbCategories={orbCategories}
                                    drifCategories={drifCategories}
                                    gameRules={gameRules || {}}
                                />
                            </div>
                            <div className={`xl:absolute xl:inset-0 flex flex-col w-full h-full ${builderTab === "character" ? "flex" : "hidden"}`}>
                                <CharacterPanel
                                    onStatsChange={handleCharacterStatsUpdate}
                                    externalConfig={characterConfig}
                                    syncTrigger={optimizationTrigger}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`flex-1 w-full flex-col ${mainView === "optimizer" ? "flex" : "hidden"}`}>
                <OptimizerPanel />
            </div>

            <div className="w-full shrink-0">
                <StatsPanel
                    stats={stats}
                    onCalculate={calculateStats}
                    isCalculating={isCalculatingStats}
                    gameRules={gameRules}
                    statSources={statSources}
                />
            </div>
        </div>
    );
}

export default App;
