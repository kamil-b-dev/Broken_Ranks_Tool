import { useCharacterDevelopment } from "./useCharacterDevelopment";
import CompactCharacterPanel from "./CompactCharacterPanel";
import ExpandedCharacterPanel from "./ExpandedCharacterPanel";

/** Connects character development state to its compact or expanded presentation. */
const CharacterPanel = ({
    onStatsChange,
    externalConfig,
    externalStats,
    syncTrigger,
    compact = false,
}) => {
    const development = useCharacterDevelopment({
        onStatsChange,
        externalConfig,
        externalStats,
        syncTrigger,
    });
    return compact ? (
        <CompactCharacterPanel development={development} />
    ) : (
        <ExpandedCharacterPanel development={development} />
    );
};

export default CharacterPanel;
