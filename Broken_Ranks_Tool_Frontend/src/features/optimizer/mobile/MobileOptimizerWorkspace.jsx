import ReorganizationGoalsPanel from "../reorganization/ReorganizationGoalsPanel";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import "../styles/optimizer-shell.css";
import "../styles/optimizer-goals.css";
import "../styles/optimizer-report.css";
import "../styles/optimizer-results.css";
import { useEffect, useRef } from "react";
import AppNotice from "../../../shared/ui/AppNotice";
import DraftSaveWarning from "../../../shared/ui/DraftSaveWarning";
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
import { OptimizerLabelContext } from "../optimizerLabelContext";

export default function MobileOptimizerWorkspace({ settings, onSettingsChange, onBackToBuilder }) {
    const { t } = useTranslation();

    const model = useOptimizerWorkspace({
        optimizerSettings: settings,
        onOptimizerSettingsChange: onSettingsChange,
    });
    const advisory = settings.mode === "ADVISOR";
    const reorganize = settings.mode === "REORGANIZE";
    const simple = !advisory && !reorganize && settings.configurationMode === "SIMPLE";
    const navigation = useMobileOptimizerNavigation(advisory);
    const heading = useRef(null);
    const bonusOpener = useRef(null);
    const mode = reorganize ? "REORGANIZE" : advisory ? "ADVISOR" : simple ? "SIMPLE" : "ADVANCED";
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
        <OptimizerLabelContext.Provider value={model.labels}>
            <main id="workspace-content" className="mobile-optimizer">
                <header className="mobile-page-title">
                    <div>
                        <h1 ref={heading} tabIndex={-1}>
                            {t(
                                reorganize
                                    ? "Reorganizacja"
                                    : advisory
                                      ? "Doradca"
                                      : "Optymalizator"
                            )}
                        </h1>
                    </div>
                </header>
                <button type="button" className="mobile-back" onClick={onBackToBuilder}>
                    {t("← Edytuj ekwipunek")}
                </button>
                <label className="mobile-field">
                    {t("Tryb")}
                    <select
                        aria-label={t("Tryb optymalizatora")}
                        disabled={model.isOptimizing}
                        value={mode}
                        onChange={(event) => {
                            const next = event.target.value;
                            onSettingsChange({
                                ...settings,
                                mode: ["ADVISOR", "REORGANIZE"].includes(next)
                                    ? next
                                    : "BUILD_FROM_SCRATCH",
                                configurationMode: ["ADVISOR", "REORGANIZE"].includes(next)
                                    ? settings.configurationMode
                                    : next,
                            });
                            navigation.change("goals");
                        }}
                    >
                        <option value="SIMPLE">{t("Prosty")}</option>
                        <option value="ADVANCED">{t("Zaawansowany")}</option>
                        <option value="ADVISOR">{t("Doradca")}</option>
                        <option value="REORGANIZE">{t("Reorganizacja")}</option>
                    </select>
                </label>
                <nav
                    className={`mobile-optimizer-sections ${advisory ? "is-advisor" : ""}`}
                    aria-label={t("Sekcje optymalizatora")}
                >
                    {sections.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            aria-current={navigation.section === key ? "page" : undefined}
                            onClick={() => navigation.change(key)}
                        >
                            {t(label)}
                        </button>
                    ))}
                </nav>
                <div className="mobile-optimizer-actions">
                    <button
                        type="button"
                        className="mobile-primary"
                        disabled={
                            model.isOptimizing ||
                            (reorganize &&
                                (model.reorganizationCheck?.blocked ||
                                    model.reorganizationCheck?.alreadySatisfied)) ||
                            (reorganize &&
                                model.displayedStatus?.applied &&
                                model.displayedStatus.reorganizationOptions?.task !== "ARRANGE") ||
                            (!advisory &&
                                !reorganize &&
                                !simple &&
                                !model.prioritizedBonuses.length) ||
                            (advisory && !model.stats)
                        }
                        onClick={model.handleOptimizeClick}
                    >
                        {model.isOptimizing ? (
                            <>
                                {t("Analiza trwa (")}
                                <OptimizationElapsedTime
                                    startedAt={model.optimizationStartedAt}
                                    elapsedSeconds={model.optimizationElapsedSeconds}
                                />
                                {t(" ")}
                                {t("s)")}
                            </>
                        ) : advisory ? (
                            "Analizuj build"
                        ) : (
                            "Uruchom optymalizację"
                        )}
                    </button>
                    {model.isOptimizing && advisory && (
                        <button type="button" onClick={model.handleCancel}>
                            {t("Zatrzymaj i pokaż znalezione plany")}
                        </button>
                    )}
                    {!model.isOptimizing && model.optimizationStatus && (
                        <div role="status">
                            <span>{t("Obliczenia zakończone.")}</span>
                            {navigation.section !== "result" && (
                                <button type="button" onClick={() => navigation.change("result")}>
                                    {t("Pokaż wynik →")}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <DraftSaveWarning
                    failed={model.draftSave?.saveFailed}
                    message="Nie udało się automatycznie zapisać ustawień optymalizatora. Ponów zapis lub pobierz konfigurację do pliku."
                    onRetry={model.draftSave?.retrySave}
                    onDownload={model.configFiles.save}
                />
                <AppNotice
                    notice={
                        model.notice
                            ? {
                                  ...model.notice,
                                  message: model.labels.formatText(model.notice.message),
                              }
                            : model.notice
                    }
                    onDismiss={() => model.setNotice(null)}
                />
                {navigation.section === "goals" && (
                    <section
                        className="mobile-optimizer-goals"
                        aria-label={t(advisory ? "Cel i ochrony" : "Konfiguracja celów")}
                    >
                        {advisory ? (
                            <AdvisorGoalsPanel
                                section="goals"
                                stats={model.stats || {}}
                                gameRules={model.gameRules}
                                settings={settings}
                                onChange={onSettingsChange}
                            />
                        ) : reorganize ? (
                            <ReorganizationGoalsPanel
                                settings={settings}
                                onChange={onSettingsChange}
                                disabled={model.isOptimizing}
                                result={model.displayedStatus}
                            />
                        ) : simple ? (
                            <SimpleProfileGoalsPanel
                                settings={settings}
                                onChange={onSettingsChange}
                            />
                        ) : (
                            <>
                                <button
                                    className="mobile-add-goal"
                                    ref={bonusOpener}
                                    type="button"
                                    onClick={() => navigation.change("goals", true)}
                                >
                                    {t("＋ Dodaj cel")}
                                </button>
                                <OptimizerPriorityToolbar
                                    fileInputRef={model.configFiles.inputRef}
                                    priorityCount={model.prioritizedBonuses.length}
                                    sortDirection={model.prioritySortDirection}
                                    categorySorted={model.categorySorted}
                                    hiddenCategories={model.hiddenPriorityCategories}
                                    categoryCounts={model.priorityCategoryCounts}
                                    anyExpanded={model.expandedPriorities.size > 0}
                                    onLoad={model.configFiles.load}
                                    onSave={model.configFiles.save}
                                    onSort={model.sortByPriority}
                                    onSortCategories={model.toggleCategorySorting}
                                    onToggleCategory={model.togglePriorityCategory}
                                    onShowAllCategories={model.showAllPriorityCategories}
                                    onToggleExpanded={model.toggleAllExpanded}
                                    onClear={model.clearAll}
                                />
                                {!model.prioritizedBonuses.length && (
                                    <p className="mobile-muted">
                                        {t("Dodaj bonus, który chcesz poprawić.")}
                                    </p>
                                )}
                                <OptimizerPriorityList
                                    priorities={model.displayedPriorities}
                                    hiddenCount={
                                        model.prioritizedBonuses.length -
                                        model.displayedPriorities.length
                                    }
                                    expandedPriorities={model.expandedPriorities}
                                    currentDetails={reorganize ? [] : model.currentModDetails}
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
                    <section aria-label={t("Dozwolone zmiany")}>
                        <label className="mobile-field">
                            {t("Profil buildu")}
                            <select
                                value={settings.advisorProfession || "AUTO"}
                                onChange={(event) =>
                                    onSettingsChange({
                                        ...settings,
                                        advisorProfession: event.target.value,
                                    })
                                }
                            >
                                <option value="AUTO">{t("Automatyczny")}</option>
                                <option value="MAGICAL">{t("Magiczny (Moc/Wiedza)")}</option>
                                <option value="PHYSICAL">{t("Fizyczny (Siła/Zręczność)")}</option>
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
        </OptimizerLabelContext.Provider>
    );
}
