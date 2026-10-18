import { useTranslation } from "../../shared/i18n/useTranslation";
import { useOptimizerLabelContext } from "./optimizerLabelContext";

const formatNumber = (value, locale) =>
    Number(value).toLocaleString(locale, { maximumFractionDigits: 2 });

/** Presents alternative optimization setups and delegates selection to the workflow owner. */
const OptimizerVariantsSection = ({
    variants,
    activeIndex,
    onSelect,
    onApply,
    advisory = false,
}) => {
    const { t, locale } = useTranslation();

    const { formatText } = useOptimizerLabelContext();
    return (
        <section className="optimizer-report-section optimizer-variants-section">
            <h5>{t("Warianty")}</h5>
            {variants?.length > 0 ? (
                <>
                    <div className="optimizer-variant-list">
                        {variants.map((variant, variantIndex) => (
                            <button
                                type="button"
                                key={`${variant.bonusName}-${variantIndex}`}
                                onClick={() => onSelect(variant, variantIndex)}
                                className={`optimizer-variant-card ${activeIndex === variantIndex ? "is-active" : ""}`}
                            >
                                <span className="optimizer-variant-radio" aria-hidden="true" />
                                <span className="optimizer-variant-copy">
                                    <strong>
                                        {t(
                                            advisory
                                                ? formatText(variant.bonusName)
                                                : variant.main
                                                  ? "Wynik główny"
                                                  : formatText(variant.bonusName)
                                        )}
                                    </strong>
                                    <small>
                                        {t(
                                            advisory
                                                ? `${formatNumber(variant.finalValue, locale)}% → ${formatNumber(variant.variantValue, locale)}% · poprawa +${formatNumber(variant.advisorGain ?? variant.gain, locale)} p.p.`
                                                : variant.main
                                                  ? "Konfiguracja bazowa optymalizatora"
                                                  : `Zysk +${formatNumber(variant.gain, locale)} · strata ${formatNumber(variant.totalLoss, locale)}`
                                        )}
                                    </small>
                                </span>
                                <span className="optimizer-variant-score">
                                    {advisory ? (
                                        <strong>
                                            {t(variant.changeCount)}
                                            {t(" działań")}
                                        </strong>
                                    ) : variant.main ? (
                                        <strong>
                                            {t(activeIndex === variantIndex ? "Wybrany" : "Główny")}
                                        </strong>
                                    ) : (
                                        <>
                                            <strong>
                                                {formatNumber(variant.finalValue, locale)}% →
                                                {t(" ")}
                                                {formatNumber(variant.variantValue, locale)}%
                                            </strong>
                                            <small>
                                                {t(variant.changeCount)}
                                                {t(" zmiany")}
                                            </small>
                                        </>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="optimizer-apply-variant"
                        onClick={() => onApply(variants[activeIndex], activeIndex)}
                    >
                        {t("Zastosuj wybrany wariant")}
                    </button>
                </>
            ) : null}
        </section>
    );
};

export default OptimizerVariantsSection;
