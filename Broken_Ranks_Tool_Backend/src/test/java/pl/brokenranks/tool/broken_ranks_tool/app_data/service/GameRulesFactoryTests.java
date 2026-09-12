package pl.brokenranks.tool.broken_ranks_tool.app_data.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.GameRulesDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

class GameRulesFactoryTests {

    private final EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
    private final GameRulesFactory factory = new GameRulesFactory(rules);

    @Test
    void exposesEveryRuleRequiredByTheFrontend() {
        GameRulesDto result =
                factory.create(
                        List.of(
                                drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_CATEGORY.OFFENSIVE),
                                drif(DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_CATEGORY.DEFENSIVE),
                                drif(null, DRIF_CATEGORY.UTILITY),
                                drif(DRIF_BONUS_TYPE.MANA_REGEN, null)));

        assertThat(result.getEpicBuiltInDrifs())
                .isEqualTo(EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS);
        assertThat(result.getSlotOrbRules()).isEqualTo(rules.getSlotOrbRules());
        assertThat(result.getDrifBasePowers())
                .containsExactlyInAnyOrderEntriesOf(
                        Arrays.stream(DRIF_BONUS_TYPE.values())
                                .collect(
                                        Collectors.toMap(
                                                Enum::name, DRIF_BONUS_TYPE::getBasePower)));
        assertThat(result.getDrifMaxCaps())
                .containsOnlyKeys(
                        Arrays.stream(DRIF_BONUS_TYPE.values())
                                .map(Enum::name)
                                .toArray(String[]::new))
                .containsEntry("DAMAGE_REDUCTION", 40)
                .containsEntry("MANA_USAGE_REDUCTION", -60)
                .containsEntry("DAMAGE_FIRE", null);
        assertThat(result.getDrifBonusCategories())
                .containsExactly(Map.entry("DAMAGE_FIRE", "OFFENSIVE"));
        assertThat(result.getDrifPenaltyMultipliers())
                .containsEntry(1, 1.0)
                .containsEntry(3, 1.0)
                .containsEntry(4, 0.95)
                .containsEntry(11, 0.54)
                .containsEntry(12, 0.50)
                .hasSize(12);
    }

    @Test
    void combinesAllDrifAndOrbBonusTranslations() {
        GameRulesDto result = factory.create(List.of());

        assertThat(result.getBonusTranslations())
                .hasSize(DRIF_BONUS_TYPE.values().length + ORB_BONUS_TYPE.values().length);
        for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values()) {
            assertThat(result.getBonusTranslations())
                    .containsEntry(type.name(), type.getDescription());
        }
        for (ORB_BONUS_TYPE type : ORB_BONUS_TYPE.values()) {
            assertThat(result.getBonusTranslations())
                    .containsEntry(type.name(), type.getDescription());
        }
    }

    private DrifTemplate drif(DRIF_BONUS_TYPE bonusType, DRIF_CATEGORY category) {
        return DrifTemplate.builder().bonusType(bonusType).category(category).build();
    }
}
