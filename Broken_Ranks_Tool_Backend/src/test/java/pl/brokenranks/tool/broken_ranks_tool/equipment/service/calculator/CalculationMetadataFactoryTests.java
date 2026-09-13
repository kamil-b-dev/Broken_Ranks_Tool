package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

class CalculationMetadataFactoryTests {

    @Test
    void createsUniqueModifierMetadataAndIgnoresIncompleteTemplates() {
        DrifTemplate first =
                DrifTemplate.builder()
                        .bonusType(DRIF_BONUS_TYPE.DAMAGE_FIRE)
                        .category(DRIF_CATEGORY.OFFENSIVE)
                        .build();
        DrifTemplate duplicate =
                DrifTemplate.builder()
                        .bonusType(DRIF_BONUS_TYPE.DAMAGE_FIRE)
                        .category(DRIF_CATEGORY.DEFENSIVE)
                        .build();
        DrifTemplate incomplete =
                DrifTemplate.builder().bonusType(DRIF_BONUS_TYPE.MANA_REGEN).build();
        OrbTemplate orb = OrbTemplate.builder().bonusType(ORB_BONUS_TYPE.EXTRA_GOLD).build();
        OrbTemplate incompleteOrb = OrbTemplate.builder().build();
        Map<Long, DrifTemplate> drifs = new LinkedHashMap<>();
        drifs.put(1L, first);
        drifs.put(2L, duplicate);
        drifs.put(3L, incomplete);
        CalculationContext context =
                new CalculationContext(Map.of(), Map.of(4L, orb, 5L, incompleteOrb), drifs);

        var result = new CalculationMetadataFactory().create(context);

        assertThat(result.drifCategories()).containsExactly(Map.entry("DAMAGE_FIRE", "OFFENSIVE"));
        assertThat(result.orbBonusTypes()).containsExactly("EXTRA_GOLD");
    }
}
