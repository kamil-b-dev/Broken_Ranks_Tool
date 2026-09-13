package pl.brokenranks.tool.broken_ranks_tool.catalog.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

class DictionaryControllerTests {

    private final DictionaryController controller = new DictionaryController();

    @Test
    void exposesCompleteItemOrbAndDrifDictionaries() {
        assertThat(controller.getCategoryDictionary().getBody())
                .hasSize(ITEM_CATEGORY.values().length);
        assertThat(controller.getCategoryDictionary().getBody())
                .containsEntry(ITEM_CATEGORY.HELMET.name(), ITEM_CATEGORY.HELMET.getDescription());

        assertThat(controller.getOrbCategoryDictionary().getBody())
                .hasSize(ORB_CATEGORY.values().length);
        assertThat(controller.getOrbCategoryDictionary().getBody())
                .containsEntry(
                        ORB_CATEGORY.OFFENSIVE.name(), ORB_CATEGORY.OFFENSIVE.getDescription());

        assertThat(controller.getDrifCategoryDictionary().getBody())
                .hasSize(DRIF_CATEGORY.values().length);
        assertThat(controller.getDrifCategoryDictionary().getBody())
                .containsEntry(
                        DRIF_CATEGORY.UTILITY.name(), DRIF_CATEGORY.UTILITY.getDescription());

        assertThat(controller.getCategoryDictionary().getHeaders().getCacheControl())
                .isEqualTo("max-age=3600, public");
    }
}
