package pl.brokenranks.tool.broken_ranks_tool;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.catalog.service.InitialDataService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;

@SpringBootTest
class BrokenRanksToolApplicationTests {

    @Autowired private InitialDataService initialDataService;

    @Test
    void contextLoads() {}

    @Test
    void productionCatalogProvidesACompleteFrontendStartupContract() {
        var data = initialDataService.getInitialData();

        assertThat(data.getItems()).isNotEmpty();
        assertThat(data.getOrbs()).isNotEmpty();
        assertThat(data.getDrifs()).isNotEmpty();
        assertThat(data.getDictionaries().getItemCategories())
                .containsKey(ITEM_CATEGORY.HELMET.name());
        assertThat(data.getGameRules().getDrifBasePowers())
                .containsKey(DRIF_BONUS_TYPE.DAMAGE_FIRE.name());
        assertThat(data.getGameRules().getDrifBonusCategories())
                .containsKey(DRIF_BONUS_TYPE.DAMAGE_FIRE.name());
        assertThat(data.getGameRules().getDrifPenaltyMultipliers()).hasSize(12);
    }
}
