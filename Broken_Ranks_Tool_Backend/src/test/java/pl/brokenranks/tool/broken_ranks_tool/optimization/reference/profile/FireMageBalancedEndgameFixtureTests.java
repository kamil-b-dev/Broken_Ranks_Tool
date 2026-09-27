package pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;

@SpringBootTest
class FireMageBalancedEndgameFixtureTests {
    @Autowired private ItemTemplateRepository items;

    @Test
    void limitsAbafAndBalancesFourDefensiveTypesAfterMagicDamage() {
        FireMageBalancedEndgameFixture fixture = new FireMageBalancedEndgameFixture(items);
        var request = fixture.request();
        var plan = fixture.objectivePlan();

        assertThat(request.getTargetQuantities().get(DRIF_BONUS_TYPE.DAMAGE_MAGIC).getMax())
                .isEqualTo(7);
        assertThat(plan.minimumValues().get(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED)).isEqualTo(140.0);
        assertThat(plan.primaryMaximizationOrder()).containsExactly(DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        assertThat(plan.balancedCapGroups()).containsExactly(fixture.defensiveTypes());
        assertThat(plan.secondaryMaximizationOrder())
                .containsExactly(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED);
        assertThat(request.getPriorities().keySet()).containsAll(fixture.defensiveTypes());
    }
}
