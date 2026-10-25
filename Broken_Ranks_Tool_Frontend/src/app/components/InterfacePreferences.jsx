import OptimizerLabelSettings from "../../features/optimizer/OptimizerLabelSettings";
import LanguageSwitcher from "../../shared/i18n/LanguageSwitcher";
import "../../shared/styles/interface-preferences.css";

export default function InterfacePreferences() {
    return (
        <div className="interface-preferences">
            <OptimizerLabelSettings />
            <LanguageSwitcher />
        </div>
    );
}
