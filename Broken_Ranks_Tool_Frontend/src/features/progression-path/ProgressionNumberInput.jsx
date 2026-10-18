import { useState } from "react";

/** Keep incomplete typing local; only a committed integer may change a stage's point budget. */
export default function ProgressionNumberInput({ value, min, max, onCommit }) {
    const [state, setState] = useState({ value, draft: String(value) });
    if (state.value !== value) setState({ value, draft: String(value) });
    const draft = state.value === value ? state.draft : String(value);
    const setDraft = (text) => setState({ value, draft: text });
    const commit = () => {
        const next = Number(draft);
        if (/^\d+$/.test(draft) && Number.isInteger(next) && next >= min && next <= max) {
            if (next !== value) onCommit(next);
            setDraft(String(next));
        } else setDraft(String(value));
    };
    return (
        <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            }}
        />
    );
}
