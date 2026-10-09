import { useCharacterDevelopment } from "./useCharacterDevelopment";
import CompactCharacterPanel from "./CompactCharacterPanel";

/** Connects character development state to the desktop presentation. */
const CharacterPanel = ({ onStatsChange, externalConfig, externalStats, syncTrigger }) => {
    const development = useCharacterDevelopment({
        onStatsChange,
        externalConfig,
        externalStats,
        syncTrigger,
    });
    return <CompactCharacterPanel development={development} />;
};

export default CharacterPanel;
