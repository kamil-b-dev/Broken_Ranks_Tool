import { useTranslation } from "../../shared/i18n/useTranslation";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";
import EquipmentSlotOverview from "./equipment/EquipmentSlotOverview";
import BuilderEquipmentViewSwitch from "./BuilderEquipmentViewSwitch";
import EquipmentRemovalActions from "./backpack/EquipmentRemovalActions";

const BuilderEquipmentWorkbench = ({
    model,
    data,
    requestData,
    gameRules,
    onOverviewItemDrop,
    getBackpackEquipWarning,
    onMaximizeLevels,
    levelWarnings = [],
    children,
    equipmentView = "character",
    onEquipmentViewChange,
    backpackContent,
    equipmentRemoval,
}) => {
    const { t } = useTranslation();

    return (
        <section className="workbench builder-equipment-column flex flex-col p-5 md:p-6">
            <div className="workbench-heading">
                <div>
                    <h2>{t("Ekwipunek")}</h2>
                </div>
                {onEquipmentViewChange && (
                    <BuilderEquipmentViewSwitch
                        view={equipmentView}
                        onChange={onEquipmentViewChange}
                    />
                )}
            </div>
            {equipmentView === "backpack" ? (
                backpackContent
            ) : (
                <>
                    <div className="equipment-level-actions">
                        <button type="button" onClick={() => onMaximizeLevels("orbs")}>
                            {t("max lvl orby")}
                        </button>
                        <button type="button" onClick={() => onMaximizeLevels("drifs")}>
                            {t("max lvl drify")}
                        </button>
                    </div>
                    <EquipmentRemovalActions actions={equipmentRemoval} />
                    {levelWarnings.length > 0 && (
                        <div className="equipment-level-warning" role="status">
                            <span>{t("Za mało pojemności:")}</span>
                            {levelWarnings.map((warning, index) => (
                                <div key={index}>{t(warning)}</div>
                            ))}
                        </div>
                    )}
                    <span className="equipment-ornament-divider" aria-hidden="true" />
                    <div className="equipment-figure-heading" aria-live="polite">
                        <strong>
                            {t(model.equippedSlotCount)}/{t(SLOTS.length)}
                        </strong>
                    </div>
                    <div className="equipment-figure-layout">
                        <div
                            className="equipment-character-figure"
                            aria-label={t("Kołowy wybór slotów ekwipunku")}
                        >
                            <span className="equipment-figure-aura" />
                            <span className="equipment-center-silhouette" aria-hidden="true" />
                            {SLOTS.map((slot) => {
                                const equipped = Boolean(model.itemForSlot(slot));
                                const active = slot.key === model.activeSlot.key;
                                return (
                                    <EquipmentSlotOverview
                                        key={slot.key}
                                        variant="ring"
                                        slotKey={slot.key}
                                        label={t(slot.label)}
                                        slotData={requestData.slots?.[slot.key]}
                                        item={model.itemForSlot(slot)}
                                        drifs={data.drifs}
                                        orbs={data.orbs}
                                        bonusTranslations={gameRules.bonusTranslations}
                                        active={active}
                                        onSelect={() => model.selectSlot(slot)}
                                        acceptedItemIds={(model.itemsBySlot[slot.key] || []).map(
                                            (candidate) => candidate.id
                                        )}
                                        onItemDrop={(item) => onOverviewItemDrop(slot, item)}
                                        getBackpackEquipWarning={getBackpackEquipWarning}
                                        className={`equipment-ring-slot-${slot.key}${equipped ? " equipment-ring-slot-equipped" : ""}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    {children}
                </>
            )}
        </section>
    );
};

export default BuilderEquipmentWorkbench;
