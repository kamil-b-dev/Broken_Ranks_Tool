import { useTranslation } from "../../../shared/i18n/useTranslation";
/** Mobile presentation of existing advanced options; values keep their shared semantics. */
export default function MobileOptimizerOptions({ settings, onChange }) {
    const { t } = useTranslation();

    if (settings.mode === "REORGANIZE") return null;
    return (
        <details className="mobile-card mobile-optimizer-options">
            <summary>{t("Opcje i warianty")}</summary>
            <label>
                <input
                    type="checkbox"
                    checked={settings.forceMaximizationByDrifBonus}
                    onChange={(event) =>
                        onChange({
                            ...settings,
                            forceMaximizationByDrifBonus: event.target.checked,
                        })
                    }
                />
                {t("Wymuś maksymalizację według bonusów do drifów")}
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={Boolean(settings.backpackOnly)}
                    onChange={(event) =>
                        onChange({
                            ...settings,
                            backpackOnly: event.target.checked,
                            ...(event.target.checked ? { generateVariants: false } : {}),
                        })
                    }
                />
                {t("Użyj drifów z plecaka")}
            </label>
            {!settings.backpackOnly && (
                <>
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.generateVariants}
                            onChange={(event) =>
                                onChange({
                                    ...settings,
                                    generateVariants: event.target.checked,
                                })
                            }
                        />
                        {t("Obliczaj dodatkowe warianty")}
                    </label>
                    <label className="mobile-field">
                        {t("Maksymalna strata wariantu (p.p.)")}
                        <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="1"
                            disabled={!settings.generateVariants}
                            value={settings.maxVariantLossPercent}
                            onChange={(event) =>
                                onChange({
                                    ...settings,
                                    maxVariantLossPercent: Number(event.target.value),
                                })
                            }
                        />
                    </label>
                </>
            )}
        </details>
    );
}
