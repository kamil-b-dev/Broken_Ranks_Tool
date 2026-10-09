package pl.brokenranks.tool.broken_ranks_tool;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.catalog.controller.InitialDataController;
import pl.brokenranks.tool.broken_ranks_tool.catalog.service.InitialDataService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;

@SpringBootTest
class BrokenRanksToolApplicationTests {

    @Autowired private InitialDataService initialDataService;
    @Autowired private InitialDataController initialDataController;
    @Autowired private tools.jackson.databind.ObjectMapper objectMapper;

    @Test
    void contextLoads() {}

    @Test
    void completeApplicationContextCachesCatalogSnapshots() {
        var response = initialDataController.getInitialData();
        assertThat(initialDataController.getInitialData()).isSameAs(response);
    }

    @Test
    void applicationJsonMapperRejectsFractionalIntegerStatistics() throws Exception {
        var type = pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.class;
        assertThatThrownBy(
                        () -> objectMapper.readValue("{\"characterStats\":{\"Siła\":12.7}}", type))
                .isInstanceOf(tools.jackson.databind.DatabindException.class);
        assertThat(
                        objectMapper
                                .readValue("{\"characterStats\":{\"Siła\":12.0}}", type)
                                .getCharacterStats())
                .containsEntry("Siła", 12);
    }

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
