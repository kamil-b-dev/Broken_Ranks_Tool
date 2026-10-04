/** Mobile presentation of existing advanced options; values keep their shared semantics. */
export default function MobileOptimizerOptions({ settings, onChange }) {
    return (
        <details className="mobile-card mobile-optimizer-options">
            <summary>Opcje i warianty</summary>
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
                Wymuś maksymalizację według bonusów do drifów
            </label>
            <label>
                <input
                    type="checkbox"
                    checked={settings.generateVariants}
                    onChange={(event) =>
                        onChange({ ...settings, generateVariants: event.target.checked })
                    }
                />
                Obliczaj dodatkowe warianty
            </label>
            <label className="mobile-field">
                Maksymalna strata wariantu (%)
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="1"
                    disabled={!settings.generateVariants}
                    value={settings.maxVariantLossPercent}
                    onChange={(event) =>
                        onChange({ ...settings, maxVariantLossPercent: Number(event.target.value) })
                    }
                />
            </label>
        </details>
    );
}
