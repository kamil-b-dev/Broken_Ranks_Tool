const ACCENT_CLASSES = {
    stone: { card: "border-stone-800", heading: "text-stone-300 border-stone-800", row: "border-stone-800 hover:bg-stone-900/50", value: "text-stone-100" },
    amber: { card: "border-amber-900/40", heading: "text-amber-500 border-amber-900/40", row: "border-amber-900/20 hover:bg-amber-900/10", value: "text-amber-400" },
    red: { card: "border-red-900/45", heading: "text-red-400 border-red-900/45", row: "border-red-900/25 hover:bg-red-950/25", value: "text-red-400" },
    sky: { card: "border-sky-900/45", heading: "text-sky-400 border-sky-900/45", row: "border-sky-900/25 hover:bg-sky-950/25", value: "text-sky-300" },
    rose: { card: "border-rose-900/45", heading: "text-rose-400 border-rose-900/45", row: "border-rose-900/25 hover:bg-rose-950/25", value: "text-rose-300" },
    violet: { card: "border-violet-900/45", heading: "text-violet-400 border-violet-900/45", row: "border-violet-900/25 hover:bg-violet-950/25", value: "text-violet-300" },
    emerald: { card: "border-emerald-900/45", heading: "text-emerald-400 border-emerald-900/45", row: "border-emerald-900/25 hover:bg-emerald-950/25", value: "text-emerald-400" },
};

const StatCategoryCard = ({ category, values, accent, colorLabels }) => {
    const styles = ACCENT_CLASSES[accent || category.accent];
    return <section className={`bg-stone-950/90 border p-4 shadow-[inset_0_0_25px_rgba(0,0,0,0.65)] ${styles.card}`}>
        <div className={`flex items-center justify-between border-b pb-2 mb-2 ${styles.heading}`}><h4 className="font-serif font-bold uppercase tracking-[0.16em] text-xs">{category.title}</h4></div>
        <div className="flex flex-col gap-1">{values.map(({ key, val, displayName }) => <div key={key} className={`flex justify-between gap-3 items-center border-b p-2 transition-colors ${styles.row}`}><span className={`min-w-0 text-xs font-serif uppercase tracking-wide ${colorLabels ? styles.value : "text-stone-400"}`}>{displayName}</span><span className={`shrink-0 font-bold font-serif ${styles.value}`}>{val}</span></div>)}</div>
    </section>;
};

const StatSummaryColumn = ({ title, accent, categories, categoryAccents = false }) => {
    const styles = ACCENT_CLASSES[accent];
    return <section className={`bg-stone-950/75 border p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] ${styles.card}`}>
        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${styles.heading}`}><h4 className="font-serif font-bold uppercase tracking-[0.18em] text-sm">{title}</h4></div>
        <div className="space-y-3">{categories.map(({ category, values }) => <StatCategoryCard key={category.title} category={category} values={values} accent={categoryAccents ? undefined : accent} colorLabels={categoryAccents} />)}</div>
    </section>;
};

export default StatSummaryColumn;
