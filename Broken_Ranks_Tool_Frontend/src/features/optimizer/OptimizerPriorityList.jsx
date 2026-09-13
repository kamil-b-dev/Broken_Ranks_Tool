import OptimizerPriorityCardHeader from "./OptimizerPriorityCardHeader";
import OptimizerPriorityForm from "./OptimizerPriorityForm";

const OptimizerPriorityList = ({
    priorities,
    expandedPriorities,
    currentDetails,
    maxCaps,
    onToggle,
    onRemove,
    onUpdate,
}) => (
    <div className="optimizer-priority-list custom-scrollbar">
        {priorities.map((bonus, index) => {
            const expanded = expandedPriorities.has(bonus.key);
            return (
                <div
                    key={bonus.key}
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
                        onToggle={() => onToggle(bonus.key)}
                        onRemove={() => onRemove(bonus)}
                    />
                    {expanded && (
                        <OptimizerPriorityForm
                            bonus={bonus}
                            potential={currentDetails.find((detail) => detail.key === bonus.key)}
                            maxCap={maxCaps?.[bonus.key]}
                            onChange={(field, value) => onUpdate(bonus.key, field, value)}
                        />
                    )}
                </div>
            );
        })}
    </div>
);

export default OptimizerPriorityList;
