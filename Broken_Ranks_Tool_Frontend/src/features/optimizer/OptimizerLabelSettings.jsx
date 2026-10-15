import { useOptimizerLabelContext } from "./optimizerLabelContext";

export default function OptimizerLabelSettings() {
    const labels = useOptimizerLabelContext();
    return (
        <label className="optimizer-label-setting">
            Nazwy modów
            <select
                aria-label="Nazwy modów"
                value={labels.mode}
                onChange={(event) => labels.changeMode(event.target.value)}
            >
                <option value="MODIFIERS">Opis bonusu</option>
                <option value="DRIFS">Nazwa drifa</option>
            </select>
        </label>
    );
}
