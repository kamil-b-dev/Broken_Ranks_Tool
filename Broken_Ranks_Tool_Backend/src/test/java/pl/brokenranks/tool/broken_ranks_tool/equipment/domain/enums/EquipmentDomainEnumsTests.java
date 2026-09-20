package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class EquipmentDomainEnumsTests {

    @Test
    void exposesStableSlotKeysAndTierLevels() {
        assertThat(EQUIPMENT_SLOT.fromKey("weapon")).isEqualTo(EQUIPMENT_SLOT.WEAPON);
        assertThat(EQUIPMENT_SLOT.WEAPON.label()).isEqualTo("broń");
        assertThat(EQUIPMENT_SLOT.fromKey("missing")).isNull();
        assertThat(ITEM_TIER.fromCode("xii")).contains(ITEM_TIER.XII);
        assertThat(ITEM_TIER.XII.getLevel()).isEqualTo(12);
        assertThat(ITEM_TIER.levelOf("unsupported")).isZero();
    }

    @Test
    void derivesMeaningfulDrifLevelsFromSizes() {
        assertThat(DRIF_SIZE.meaningfulLevels()).isEqualTo(List.of(6, 11, 16, 21));
        assertThat(DRIF_SIZE.levelForPowerMultiplier(1)).isEqualTo(6);
        assertThat(DRIF_SIZE.levelForPowerMultiplier(4)).isEqualTo(21);
    }

    @Test
    void keepsCapacityBonusesOnStarDefinitions() {
        assertThat(ITEM_STAR.GOLD_1.getCapacityBonus()).isEqualTo(1);
        assertThat(ITEM_STAR.GOLD_2.getCapacityBonus()).isEqualTo(2);
        assertThat(ITEM_STAR.GOLD_3.getCapacityBonus()).isEqualTo(4);
    }
}
