package pl.brokenranks.tool.broken_ranks_tool.catalog.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.catalog.dto.DictionariesDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

class DictionariesFactoryTests {

    @Test
    void createsCompleteCategoryDictionaries() {
        DictionariesDto result = new DictionariesFactory().create();

        assertThat(result.getItemCategories()).hasSize(ITEM_CATEGORY.values().length);
        for (ITEM_CATEGORY value : ITEM_CATEGORY.values()) {
            assertThat(result.getItemCategories())
                    .containsEntry(value.name(), value.getDescription());
        }

        assertThat(result.getOrbCategories()).hasSize(ORB_CATEGORY.values().length);
        for (ORB_CATEGORY value : ORB_CATEGORY.values()) {
            assertThat(result.getOrbCategories())
                    .containsEntry(value.name(), value.getDescription());
        }

        assertThat(result.getDrifCategories()).hasSize(DRIF_CATEGORY.values().length);
        for (DRIF_CATEGORY value : DRIF_CATEGORY.values()) {
            assertThat(result.getDrifCategories())
                    .containsEntry(value.name(), value.getDescription());
        }
    }
}
