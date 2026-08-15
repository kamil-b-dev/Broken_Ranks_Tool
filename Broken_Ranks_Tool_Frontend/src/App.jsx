import { useState, useMemo, useRef } from "react";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";
import OptimizerPanel from "./components/OptimizerPanel";
import { useEquipment } from "./context/EquipmentContext";
import { SLOTS } from "./constants/equipment";

/**
 * Główny komponent aplikacji, orkiestrujący nawigację najwyższego poziomu.
 * Posiada globalny przełącznik widoków (Kreator vs Optymalizator).
 *
 * @returns {JSX.Element} Wyrenderowany główny widok aplikacji
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
        <div className="w-full max-w-[1920px] mx-auto p-4 xl:p-8 flex flex-col gap-6 xl:gap-8 font-serif min-h-screen">

            <div className="shrink-0">
                <h1 className="text-3xl font-bold text-center text-stone-300 uppercase tracking-[0.2em] mb-6 border-b-4 border-double border-red-900/70 pb-4 drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                    Broken Ranks Tool
                </h1>

                <div className="flex flex-wrap justify-center gap-3 mb-4">
                    <button
                        type="button"
                        onClick={saveBuildToFile}
                        className="px-4 py-2 bg-black border border-amber-900/70 text-amber-600 hover:text-amber-400 hover:border-amber-600 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        Zapisz build (.json)
                    </button>
                    <button
                        type="button"
                        onClick={() => buildFileInputRef.current?.click()}
                        className="px-4 py-2 bg-black border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        Wczytaj build
                    </button>
                    <input
                        ref={buildFileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleBuildFileChange}
                        className="hidden"
                    />
                </div>

                <div className="flex bg-black border-2 border-stone-800 shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden w-full max-w-2xl mx-auto">
                    <button
                        onClick={() => setMainView("builder")}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "builder"
                                ? "bg-stone-900 border-b-2 border-red-800 text-stone-200 shadow-inner"
                                : "text-stone-600 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                        }`}
                    >
                        Kreator Ekwipunku
                    </button>
                    <button
                        onClick={() => setMainView("optimizer")}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                            mainView === "optimizer"
                                ? "bg-purple-950/30 border-b-2 border-purple-600 text-purple-400 shadow-inner"
                                : "text-stone-600 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                        }`}
                    >
                        Optymalizator Drifów
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
                    <div className="xl:col-span-8 bg-gradient-to-b from-stone-900 to-black p-6 xl:p-8 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col">
                        <div className="flex flex-wrap justify-center gap-4 xl:gap-6 pb-4">
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
                    </div>

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
                <StatsPanel stats={stats} onCalculate={calculateStats} gameRules={gameRules} />
            </div>
        </div>
    );
}

export default App;
