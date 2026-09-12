package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

class UpgradeLevelPolicyTests {

    private final UpgradeLevelPolicy policy = new UpgradeLevelPolicy();

    @Test
    void calculatesCapacityForEveryHighStarThreshold() {
        ItemTemplate item = ItemTemplate.builder().capacity(10).build();

        assertThat(policy.calculateItemCapacity(item, 6)).isEqualTo(10);
        assertThat(policy.calculateItemCapacity(item, 7)).isEqualTo(11);
        assertThat(policy.calculateItemCapacity(item, 8)).isEqualTo(12);
        assertThat(policy.calculateItemCapacity(item, 9)).isEqualTo(14);
        assertThat(policy.calculateItemCapacity(item, 99)).isEqualTo(14);
        assertThat(policy.calculateItemCapacity(ItemTemplate.builder().build(), 9)).isZero();
        assertThat(policy.calculateItemCapacity(ItemTemplate.builder().capacity(0).build(), 9))
                .isZero();
    }

    @Test
    void clampsDrifOrbAndItemUpgradeLevels() {
        DrifTemplate boundedDrif = DrifTemplate.builder().size(DRIF_SIZE.SUBDRIF).build();
        DrifTemplate unboundedDrif = DrifTemplate.builder().build();
        OrbTemplate boundedOrb = OrbTemplate.builder().size(ORB_SIZE.SUBORB).build();
        OrbTemplate unboundedOrb = OrbTemplate.builder().build();

        assertThat(policy.sanitizeDrifLevel(-2, boundedDrif)).isEqualTo(1);
        assertThat(policy.sanitizeDrifLevel(99, boundedDrif)).isEqualTo(6);
        assertThat(policy.sanitizeDrifLevel(8, unboundedDrif)).isEqualTo(8);
        assertThat(policy.sanitizeOrbLevel(-2, boundedOrb)).isEqualTo(1);
        assertThat(policy.sanitizeOrbLevel(99, boundedOrb)).isEqualTo(1);
        assertThat(policy.sanitizeOrbLevel(8, unboundedOrb)).isEqualTo(8);
        assertThat(policy.sanitizeItemStars(-1)).isEqualTo(1);
        assertThat(policy.sanitizeItemStars(99)).isEqualTo(9);
    }
}
