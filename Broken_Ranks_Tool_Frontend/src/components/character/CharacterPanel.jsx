import { useCharacterDevelopment } from "../../hooks/useCharacterDevelopment";
import CompactCharacterPanel from "./CompactCharacterPanel";
import ExpandedCharacterPanel from "./ExpandedCharacterPanel";

/** Connects character development state to its compact or expanded presentation. */
const CharacterPanel = ({ onStatsChange, externalConfig, syncTrigger, compact = false }) => {
    const development = useCharacterDevelopment({ onStatsChange, externalConfig, syncTrigger });
    return compact ? (
        <CompactCharacterPanel development={development} />
    ) : (
        <ExpandedCharacterPanel development={development} />
    );
};

export default CharacterPanel;
