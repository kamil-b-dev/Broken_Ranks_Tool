import "../styles/optimizer-shell.css";
import "../styles/optimizer-goals.css";
import "../styles/optimizer-report.css";
import "../styles/optimizer-results.css";
import { useEffect, useRef } from "react";
import AppNotice from "../../../shared/ui/AppNotice";
import { useOptimizerWorkspace } from "../useOptimizerWorkspace";
import AdvisorGoalsPanel from "../advisor/AdvisorGoalsPanel";
import SimpleProfileGoalsPanel from "../simple-profile/SimpleProfileGoalsPanel";
import OptimizerLocksColumn from "../OptimizerLocksColumn";
import OptimizerPriorityList from "../OptimizerPriorityList";
import OptimizerPriorityToolbar from "../OptimizerPriorityToolbar";
import MobileBonusPicker from "./MobileBonusPicker";
import MobileOptimizerOptions from "./MobileOptimizerOptions";
import MobileOptimizerReport from "./MobileOptimizerReport";
import { useMobileOptimizerNavigation } from "./useMobileOptimizerNavigation";
import "./mobile-optimizer.css";
import OptimizationElapsedTime from "../OptimizationElapsedTime";

export default function MobileOptimizerWorkspace({ settings, onSettingsChange, onBackToBuilder }) {
    const model = useOptimizerWorkspace({
        optimizerSettings: settings,
        onOptimizerSettingsChange: onSettingsChange,
    });
    const advisory = settings.mode === "ADVISOR";
    const simple = !advisory && settings.configurationMode === "SIMPLE";
    const navigation = useMobileOptimizerNavigation(advisory);
    const heading = useRef(null);
    const bonusOpener = useRef(null);
    const mode = advisory ? "ADVISOR" : simple ? "SIMPLE" : "ADVANCED";
    const sections = [
        ["goals", advisory ? "Cel i ochrony" : simple ? "Profil" : "Cele"],
        ...(advisory ? [["changes", "Dozwolone zmiany"]] : []),
        ["locks", advisory ? "Build i blokady" : "Blokady"],
        ["result", advisory ? "Porady" : "Wynik"],
    ];
    useEffect(() => {
        heading.current?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "instant" });
    }, [navigation.section, mode]);
    return (
        <main id="workspace-content" className="mobile-optimizer">
            <header className="mobile-page-title">
                <div>
                    <h1 ref={heading} tabIndex={-1}>
                        {advisory ? "Doradca" : "Optymalizator"}
                    </h1>
                </div>
            </header>
            <button type="button" className="mobile-back" onClick={onBackToBuilder}>
                ← Edytuj ekwipunek
            </button>
            <label className="mobile-field">
                Tryb
                <select
                    aria-label="Tryb optymalizatora"
                    disabled={model.isOptimizing}
                    value={mode}
                    onChange={(event) => {
                        const next = event.target.value;
                        onSettingsChange({
                            ...settings,
                            mode: next === "ADVISOR" ? "ADVISOR" : "BUILD_FROM_SCRATCH",
                            configurationMode:
                                next === "ADVISOR" ? settings.configurationMode : next,
                        });
                        navigation.change("goals");
                    }}
                >
                    <option value="SIMPLE">Prosty</option>
                    <option value="ADVANCED">Zaawansowany</option>
                    <option value="ADVISOR">Doradca</option>
                </select>
            </label>
            <nav
                className={`mobile-optimizer-sections ${advisory ? "is-advisor" : ""}`}
                aria-label="Sekcje optymalizatora"
            >
                {sections.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        aria-current={navigation.section === key ? "page" : undefined}
                        onClick={() => navigation.change(key)}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            <div className="mobile-optimizer-actions">
                <button
                    type="button"
                    className="mobile-primary"
                    disabled={
                        model.isOptimizing ||
                        (!advisory && !simple && !model.prioritizedBonuses.length) ||
                        (advisory && !model.stats)
                    }
                    onClick={model.handleOptimizeClick}
                >
                    {model.isOptimizing ? (
                        <>
                            Analiza trwa (
                            <OptimizationElapsedTime
                                startedAt={model.optimizationStartedAt}
                                elapsedSeconds={model.optimizationElapsedSeconds}
                            />{" "}
                            s)
                        </>
                    ) : advisory ? (
                        "Analizuj build"
                    ) : (
                        "Uruchom optymalizację"
                    )}
                </button>
                {model.isOptimizing && advisory && (
                    <button type="button" onClick={model.handleCancel}>
                        Zatrzymaj i pokaż znalezione plany
                    </button>
                )}
                {!model.isOptimizing && model.optimizationStatus && (
                    <div role="status">
                        <span>Obliczenia zakończone.</span>
                        {navigation.section !== "result" && (
                            <button type="button" onClick={() => navigation.change("result")}>
                                Pokaż wynik →
                            </button>
                        )}
                    </div>
                )}
            </div>
            <AppNotice notice={model.notice} onDismiss={() => model.setNotice(null)} />
            {navigation.section === "goals" && (
                <section
                    className="mobile-optimizer-goals"
                    aria-label={advisory ? "Cel i ochrony" : "Konfiguracja celów"}
                >
                    {advisory ? (
                        <AdvisorGoalsPanel
                            section="goals"
                            stats={model.stats || {}}
                            gameRules={model.gameRules}
                            settings={settings}
                            onChange={onSettingsChange}
                        />
                    ) : simple ? (
                        <SimpleProfileGoalsPanel settings={settings} onChange={onSettingsChange} />
                    ) : (
                        <>
                            <button
                                className="mobile-add-goal"
                                ref={bonusOpener}
                                type="button"
                                onClick={() => navigation.change("goals", true)}
                            >
                                ＋ Dodaj cel
                            </button>
                            <OptimizerPriorityToolbar
                                fileInputRef={model.configFiles.inputRef}
                                priorityCount={model.prioritizedBonuses.length}
                                sortDirection={model.prioritySortDirection}
                                anyExpanded={model.expandedPriorities.size > 0}
                                onLoad={model.configFiles.load}
                                onSave={model.configFiles.save}
                                onSort={model.sortByPriority}
                                onToggleExpanded={model.toggleAllExpanded}
                                onClear={model.clearAll}
                            />
                            {!model.prioritizedBonuses.length && (
                                <p className="mobile-muted">Dodaj bonus, który chcesz poprawić.</p>
                            )}
                            <OptimizerPriorityList
                                priorities={model.prioritizedBonuses}
                                expandedPriorities={model.expandedPriorities}
                                currentDetails={model.currentModDetails}
                                maxCaps={model.gameRules.drifMaxCaps}
                                onToggle={model.toggleExpanded}
                                onRemove={model.removeBonus}
                                onUpdate={model.updateBonus}
                                configurationMode="ADVANCED"
                            />
                            <MobileOptimizerOptions
                                settings={settings}
                                onChange={onSettingsChange}
                            />
                        </>
                    )}
                </section>
            )}
            {navigation.section === "changes" && advisory && (
                <section aria-label="Dozwolone zmiany">
                    <label className="mobile-field">
                        Profil buildu
                        <select
                            value={settings.advisorProfession || "AUTO"}
                            onChange={(event) =>
                                onSettingsChange({
                                    ...settings,
                                    advisorProfession: event.target.value,
                                })
                            }
                        >
                            <option value="AUTO">Automatyczny</option>
                            <option value="MAGICAL">Magiczny (Moc/Wiedza)</option>
                            <option value="PHYSICAL">Fizyczny (Siła/Zręczność)</option>
                        </select>
                    </label>
                    <AdvisorGoalsPanel
                        section="changes"
                        stats={model.stats || {}}
                        gameRules={model.gameRules}
                        settings={settings}
                        onChange={onSettingsChange}
                    />
                </section>
            )}
            {navigation.section === "locks" && (
                <OptimizerLocksColumn
                    active
                    slots={model.requestData.slots}
                    items={model.data.items}
                    drifs={model.data.drifs}
                    lockedSlots={model.lockedSlots}
                    lockedDrifs={model.lockedDrifs}
                    onToggleSlot={model.toggleSlotLock}
                    onToggleDrif={model.toggleDrifLock}
                    mode={settings.mode}
                />
            )}
            {navigation.section === "result" && (
                <MobileOptimizerReport model={model} advisory={advisory} />
            )}
            {!advisory && !simple && navigation.picking && (
                <MobileBonusPicker
                    openerRef={bonusOpener}
                    model={model}
                    onClose={navigation.closePicker}
                />
            )}
        </main>
    );
}
