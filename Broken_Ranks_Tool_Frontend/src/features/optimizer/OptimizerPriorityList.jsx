import { memo, useCallback } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";
import OptimizerPriorityCardHeader from "./OptimizerPriorityCardHeader";
import OptimizerPriorityForm from "./OptimizerPriorityForm";
import { useOptimizerLabelContext } from "./optimizerLabelContext";

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
    const { getName } = useOptimizerLabelContext();
    const name = getName(bonus.key, bonus.value);
    const displayedBonus = { ...bonus, value: name };
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
                bonus={displayedBonus}
                expanded={expanded}
                onToggle={toggle}
                onRemove={remove}
                simple={configurationMode === "SIMPLE"}
            />
            {expanded && (
                <OptimizerPriorityForm
                    bonus={displayedBonus}
                    potential={potential}
                    maxCap={maxCap}
                    onChange={update}
                    simple={configurationMode === "SIMPLE"}
                    weightLabel={`Waga priorytetu dla ${name}`}
                />
            )}
        </div>
    );
});

const OptimizerPriorityList = ({
    priorities,
    hiddenCount = 0,
    expandedPriorities,
    currentDetails,
    maxCaps,
    onToggle,
    onRemove,
    onUpdate,
    configurationMode,
}) => {
    const { t } = useTranslation();
    return (
        <div className="optimizer-priority-list custom-scrollbar">
            {priorities.length === 0 && hiddenCount > 0 && (
                <p className="optimizer-priority-hidden-message" role="status">
                    {t("Priorytety są ukryte.")}
                </p>
            )}
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
};

export default OptimizerPriorityList;
