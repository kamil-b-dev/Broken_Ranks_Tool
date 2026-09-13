import { useRef } from "react";

/** WAI-ARIA tabs with roving focus and keyboard navigation. */
const TabList = ({ label, tabs, active, onChange, idPrefix, panelId, className }) => {
    const refs = useRef([]);
    const selectAt = (index) => {
        const normalized = (index + tabs.length) % tabs.length;
        onChange(tabs[normalized].value);
        refs.current[normalized]?.focus();
    };
    const onKeyDown = (event, index) => {
        const offsets = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
        if (event.key in offsets) {
            event.preventDefault();
            selectAt(index + offsets[event.key]);
        } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            selectAt(event.key === "Home" ? 0 : tabs.length - 1);
        }
    };

    return (
        <div className={className} role="tablist" aria-label={label}>
            {tabs.map((tab, index) => (
                <button
                    key={tab.value}
                    ref={(element) => {
                        refs.current[index] = element;
                    }}
                    id={`${idPrefix}-tab-${tab.value}`}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.value}
                    aria-controls={panelId ?? `${idPrefix}-panel-${tab.value}`}
                    tabIndex={active === tab.value ? 0 : -1}
                    onClick={() => onChange(tab.value)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default TabList;
