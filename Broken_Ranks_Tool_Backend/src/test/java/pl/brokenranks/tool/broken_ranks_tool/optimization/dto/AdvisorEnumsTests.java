package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;

class AdvisorEnumsTests {

    @Test
    void groupsPlansByUpgradeCount() {
        assertThat(AdvisorPlanKind.fromUpgradeCount(0)).isEqualTo(AdvisorPlanKind.MOVES);
        assertThat(AdvisorPlanKind.fromUpgradeCount(1)).isEqualTo(AdvisorPlanKind.ONE_UPGRADE);
        assertThat(AdvisorPlanKind.fromUpgradeCount(2)).isEqualTo(AdvisorPlanKind.PLAN);
    }

    @Test
    void matchesExplicitAndUniversalItemProfiles() {
        assertThat(AdvisorProfession.PHYSICAL.accepts(ITEM_PROFILE.PHYSICAL)).isTrue();
        assertThat(AdvisorProfession.PHYSICAL.accepts(ITEM_PROFILE.MAGICAL)).isFalse();
        assertThat(AdvisorProfession.MAGICAL.accepts(ITEM_PROFILE.UNIVERSAL)).isTrue();
        assertThat(AdvisorProfession.UNIVERSAL.accepts(ITEM_PROFILE.UNIVERSAL)).isTrue();
        assertThat(AdvisorProfession.UNIVERSAL.accepts(ITEM_PROFILE.PHYSICAL)).isFalse();
    }
}
