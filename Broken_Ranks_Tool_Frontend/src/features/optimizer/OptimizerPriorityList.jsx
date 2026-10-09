import { memo, useCallback } from "react";
import OptimizerPriorityCardHeader from "./OptimizerPriorityCardHeader";
import OptimizerPriorityForm from "./OptimizerPriorityForm";

const PriorityCard = memo(function PriorityCard({
    bonus,
    index,
    expanded,
    potential,
    maxCap,
    onToggle,
    onRemove,
    onUpdate,
    configurationMode,
}) {
    const toggle = useCallback(() => onToggle(bonus.key), [onToggle, bonus.key]);
    const remove = useCallback(() => onRemove(bonus), [onRemove, bonus]);
    const update = useCallback(
        (field, value) => onUpdate(bonus.key, field, value),
        [onUpdate, bonus.key]
    );
    return (
        <div
            className={`optimizer-priority-card ${expanded ? "optimizer-priority-card-expanded" : ""}`}
        >
            <div
                className="optimizer-priority-weight-fill"
                style={{ width: `${(bonus.weight / 30) * 100}%` }}
            />
            <OptimizerPriorityCardHeader
                index={index}
                bonus={bonus}
                expanded={expanded}
                onToggle={toggle}
                onRemove={remove}
                simple={configurationMode === "SIMPLE"}
            />
            {expanded && (
                <OptimizerPriorityForm
                    bonus={bonus}
                    potential={potential}
                    maxCap={maxCap}
                    onChange={update}
                    simple={configurationMode === "SIMPLE"}
                    weightLabel={`Waga priorytetu dla ${bonus.value}`}
                />
            )}
        </div>
    );
});

const OptimizerPriorityList = ({
    priorities,
    expandedPriorities,
    currentDetails,
    maxCaps,
    onToggle,
    onRemove,
    onUpdate,
    configurationMode,
}) => (
    <div className="optimizer-priority-list custom-scrollbar">
        {priorities.map((bonus, index) => (
            <PriorityCard
                key={bonus.key}
                bonus={bonus}
                index={index}
                expanded={expandedPriorities.has(bonus.key)}
                potential={currentDetails.find((detail) => detail.key === bonus.key)}
                maxCap={maxCaps?.[bonus.key]}
                onToggle={onToggle}
                onRemove={onRemove}
                onUpdate={onUpdate}
                configurationMode={configurationMode}
            />
        ))}
    </div>
);

export default OptimizerPriorityList;
