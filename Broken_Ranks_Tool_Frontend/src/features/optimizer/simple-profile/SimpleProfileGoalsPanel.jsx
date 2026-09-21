import { SIMPLE_ASPECTS, SIMPLE_IMPORTANCE } from "./simpleProfileDefinitions";

/** Lets a simple-mode player compose a build from understandable goals. */
const SimpleProfileGoalsPanel = ({ settings, onChange }) => {
    const selected = settings.simpleAspects || {};
    const updateAspect = (key, value) => {
        const next = { ...selected };
        if (value) next[key] = value;
        else delete next[key];
        onChange({ ...settings, simpleAspects: next });
    };

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="mb-3 border border-purple-950/80 bg-black/30 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                    Co liczy się w buildzie?
                </h4>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
                    Algorytm rozdzieli dostępne gniazda między zaznaczone obszary. Wcześniejsze
                    punkty statystyki są warte więcej, więc słabszy ekwipunek nie będzie na siłę
                    dążył do nieosiągalnego capa.
                </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
                {SIMPLE_ASPECTS.map((aspect) => {
                    const importance = selected[aspect.key];
                    return (
                        <article
                            key={aspect.key}
                            className={`border p-3 ${importance ? "border-purple-700/80 bg-purple-950/20" : "border-stone-800 bg-black/25"}`}
                        >
                            <label className="flex cursor-pointer items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(importance)}
                                    onChange={(event) =>
                                        updateAspect(
                                            aspect.key,
                                            event.target.checked ? "IMPORTANT" : null
                                        )
                                    }
                                    className="mt-0.5 h-4 w-4 accent-purple-700"
                                />
                                <span>
                                    <strong className="block text-xs uppercase tracking-wide text-stone-200">
                                        {aspect.label}
                                    </strong>
                                    <span className="mt-1 block text-[10px] leading-relaxed text-stone-500">
                                        {aspect.description}
                                    </span>
                                </span>
                            </label>
                            {importance && (
                                <label className="mt-3 flex items-center justify-between gap-3 border-t border-stone-800 pt-2 text-[10px] uppercase tracking-wider text-stone-400">
                                    Znaczenie
                                    <select
                                        value={importance}
                                        onChange={(event) =>
                                            updateAspect(aspect.key, event.target.value)
                                        }
                                        aria-label={`Znaczenie: ${aspect.label}`}
                                        className="border border-purple-900/80 bg-black px-2 py-1 text-stone-200"
                                    >
                                        {SIMPLE_IMPORTANCE.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default SimpleProfileGoalsPanel;
