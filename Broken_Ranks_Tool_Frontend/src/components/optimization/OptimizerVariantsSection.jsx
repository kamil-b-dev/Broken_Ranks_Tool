import React from "react";

const formatNumber = (value) => Number(value).toLocaleString("pl-PL", { maximumFractionDigits: 2 });

/** Presents alternative optimization setups and delegates selection to the workflow owner. */
const OptimizerVariantsSection = ({ variants, activeIndex, onSelect, onApply }) => (
    <section className="optimizer-report-section optimizer-variants-section">
        <h5>Warianty</h5>
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
                                <strong>{variant.main ? "Wynik główny" : variant.bonusName}</strong>
                                <small>
                                    {variant.main
                                        ? "Konfiguracja bazowa optymalizatora"
                                        : `Zysk +${formatNumber(variant.gain)} · strata ${formatNumber(variant.totalLoss)}`}
                                </small>
                            </span>
                            <span className="optimizer-variant-score">
                                {variant.main ? (
                                    <strong>
                                        {activeIndex === variantIndex ? "Wybrany" : "Główny"}
                                    </strong>
                                ) : (
                                    <>
                                        <strong>
                                            {formatNumber(variant.finalValue)}% →{" "}
                                            {formatNumber(variant.variantValue)}%
                                        </strong>
                                        <small>{variant.changeCount} zmiany</small>
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
                    Zastosuj wybrany wariant
                </button>
            </>
        ) : (
            <p className="optimizer-report-empty">
                Brak ocenionych wariantów poprawiających maksymalizowany mod.
            </p>
        )}
    </section>
);

export default OptimizerVariantsSection;
