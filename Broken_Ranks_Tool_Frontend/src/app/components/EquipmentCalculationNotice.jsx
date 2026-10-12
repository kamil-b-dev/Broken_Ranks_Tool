import { useEquipmentCalculation } from "../../shared/state/EquipmentContext";
import AppNotice from "../../shared/ui/AppNotice";

/** Calculation feedback subscribes independently of navigation and build menus. */
export default function EquipmentCalculationNotice() {
    const { calculationNotice, dismissCalculationNotice } = useEquipmentCalculation();
    return <AppNotice notice={calculationNotice} onDismiss={dismissCalculationNotice} />;
}
