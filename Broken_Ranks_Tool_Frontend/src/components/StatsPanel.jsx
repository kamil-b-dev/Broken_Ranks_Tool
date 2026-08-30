import { buildStatColumns } from "./stats_panel/statsPanelDomain";
import StatSummaryColumn from "./stats_panel/StatSummaryColumn";
import crest from "../assets/broken-ranks-crest.png";

/** Displays calculated statistics grouped by their purpose and source. */
const StatsPanel = ({
    stats,
    onCalculate,
    isCalculating = false,
    gameRules,
    statSources = {},
    compact = false,
}) => {
    const statColumns = buildStatColumns({ stats, gameRules, statSources });

    return (
        <section
            className={`w-full border border-stone-700/70 bg-gradient-to-b from-stone-900 to-black shadow-[0_0_30px_rgba(0,0,0,0.75)] ${compact ? "builder-stats-panel p-4" : "p-5 md:p-6"}`}
        >
            <div
                className={`flex flex-col gap-4 border-b-4 border-double border-red-900/70 pb-4 ${compact ? "mb-4" : "mb-6 md:flex-row md:items-end md:justify-between"}`}
            >
                <div>
                    <p className="section-kicker">Wynik konfiguracji</p>
                    <h3
                        className={`${compact ? "text-lg" : "text-xl md:text-2xl"} font-serif font-bold text-stone-200 uppercase tracking-[0.18em] drop-shadow-[0_2px_5px_rgba(0,0,0,1)]`}
                    >
                        {compact ? "Wynik buildu" : "Podsumowanie statystyk"}
                    </h3>
                </div>
                <button
                    type="button"
                    className="w-full border border-red-800 bg-gradient-to-b from-red-900 to-black px-6 py-3 font-serif text-sm font-bold uppercase tracking-widest text-stone-200 shadow-[0_0_15px_rgba(153,27,27,0.35)] transition-all hover:border-red-600 hover:from-red-800 hover:shadow-[0_0_25px_rgba(220,38,38,0.45)] disabled:cursor-wait disabled:opacity-70 disabled:hover:border-red-800 disabled:hover:from-red-900 disabled:hover:shadow-[0_0_15px_rgba(153,27,27,0.35)] md:w-auto"
                    onClick={onCalculate}
                    disabled={isCalculating}
                >
                    {isCalculating ? "Przeliczanie..." : "Przelicz statystyki"}
                </button>
            </div>
            {statColumns.length === 0 ? (
                <div className="stats-empty-state">
                    <img src={crest} alt="" aria-hidden="true" />
                    <strong>Wybierz ekwipunek</strong>
                    <p>Gotowy build przeliczysz przyciskiem powyżej.</p>
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-5 ${compact ? "" : "lg:grid-cols-3"}`}>
                    {statColumns.map((column) => (
                        <StatSummaryColumn key={column.title} {...column} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default StatsPanel;
