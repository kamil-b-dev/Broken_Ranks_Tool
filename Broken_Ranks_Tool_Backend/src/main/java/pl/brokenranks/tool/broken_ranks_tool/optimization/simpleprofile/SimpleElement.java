package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

/** Optional weapon element selected by a profession profile. */
public enum SimpleElement {
    NONE(null),
    FIRE(DRIF_BONUS_TYPE.DAMAGE_FIRE),
    FROST(DRIF_BONUS_TYPE.DAMAGE_FROST),
    ENERGY(DRIF_BONUS_TYPE.DAMAGE_ENERGY);

    private final DRIF_BONUS_TYPE bonusType;

    SimpleElement(DRIF_BONUS_TYPE bonusType) {
        this.bonusType = bonusType;
    }

    public DRIF_BONUS_TYPE bonusType() {
        return bonusType;
    }
}
