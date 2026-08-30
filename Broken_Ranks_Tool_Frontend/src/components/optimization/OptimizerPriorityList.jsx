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
    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
        {priorities.length === 0 ? (
            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">
                Wybierz bonusy z lewej listy, aby ustawić priorytety.
            </p>
        ) : (
            priorities.map((bonus, index) => {
                const expanded = expandedPriorities.has(bonus.key);
                return (
                    <div
                        key={bonus.key}
                        className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden"
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none"
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
                                potential={currentDetails.find(
                                    (detail) => detail.key === bonus.key
                                )}
                                maxCap={maxCaps?.[bonus.key]}
                                onChange={(field, value) => onUpdate(bonus.key, field, value)}
                            />
                        )}
                    </div>
                );
            })
        )}
    </div>
);

export default OptimizerPriorityList;
