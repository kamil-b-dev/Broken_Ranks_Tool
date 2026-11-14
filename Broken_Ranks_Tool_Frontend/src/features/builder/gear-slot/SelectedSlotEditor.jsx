import { useTranslation } from "../../../shared/i18n/useTranslation";
import GearSlot from "./GearSlot";
import ItemReplacementPreview from "../preview/ItemReplacementPreview";
import SynergeticEditor from "../synergetics/SynergeticEditor";

/** Edits the slot currently selected in the equipment overview. */
const SelectedSlotEditor = ({
    model,
    data,
    requestData,
    gameRules,
    optimizationTrigger,
    onSlotUpdate,
    onBackpackEquip,
    getBackpackEquipWarning,
    equipmentRemoval,
}) => {
    const { t } = useTranslation();
    return (
        <section className="selected-slot-editor" aria-label={t("Edytor wybranego slotu")}>
            <div className="selected-slot-editor-heading">
                <div>
                    <p className="section-kicker">{t("Edytowany slot")}</p>
                    <h3>{t(model.activeSlot.label)}</h3>
                </div>
            </div>
            <div className="selected-slot-editor-content">
                {[model.activeSlot].map((slot) => (
                    <div key={slot.key}>
                        {!requestData.slots?.[slot.key]?.synergetic && (
                            <GearSlot
                                expanded
                                slotKey={slot.key}
                                label={t(slot.label)}
                                items={model.itemsBySlot[slot.key] || []}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                allSlots={requestData.slots || {}}
                                onUpdate={onSlotUpdate}
                                onBackpackEquip={onBackpackEquip}
                                getBackpackEquipWarning={getBackpackEquipWarning}
                                equipmentRemoval={equipmentRemoval}
                                gameRules={gameRules}
                                optimizationTrigger={optimizationTrigger}
                            />
                        )}
                        <SynergeticEditor
                            key={JSON.stringify(requestData.slots?.[slot.key]?.synergetic)}
                            slotKey={slot.key}
                            slot={requestData.slots?.[slot.key]}
                            onUpdate={onSlotUpdate}
                        />
                    </div>
                ))}
            </div>
            <ItemReplacementPreview
                key={model.activeSlot.key}
                slotKey={model.activeSlot.key}
                items={model.itemsBySlot[model.activeSlot.key] || []}
                data={data}
                gameRules={gameRules}
                requestData={requestData}
            />
        </section>
    );
};

export default SelectedSlotEditor;
