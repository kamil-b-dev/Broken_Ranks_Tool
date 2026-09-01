package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CLASS_SCOPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;

@SpringBootTest
class ItemTemplateClassificationPersistenceTests {

    @Autowired private ItemTemplateRepository repository;

    @Test
    void loadsTheMigratedProfilesAndUnclassifiedClassAssignments() {
        var items = repository.findAll();
        Map<ITEM_PROFILE, Long> profileCounts =
                items.stream()
                        .collect(
                                Collectors.groupingBy(
                                        item -> item.getProfile(), Collectors.counting()));

        assertThat(items).hasSize(174);
        assertThat(profileCounts)
                .containsEntry(ITEM_PROFILE.PHYSICAL, 57L)
                .containsEntry(ITEM_PROFILE.MAGICAL, 54L)
                .containsEntry(ITEM_PROFILE.UNIVERSAL, 17L)
                .containsEntry(ITEM_PROFILE.UNSPECIFIED, 46L);
        assertThat(items)
                .allSatisfy(
                        item -> {
                            assertThat(item.getClassScope()).isEqualTo(ITEM_CLASS_SCOPE.UNKNOWN);
                            assertThat(item.getAllowedClasses()).isEmpty();
                        });
        assertThat(items)
                .filteredOn(item -> item.getName().equals("Dar Skrzydlatej"))
                .singleElement()
                .extracting(item -> item.getProfile())
                .isEqualTo(ITEM_PROFILE.UNIVERSAL);
        assertThat(items)
                .filteredOn(item -> item.getName().equals("Serce Seleny"))
                .singleElement()
                .extracting(item -> item.getProfile())
                .isEqualTo(ITEM_PROFILE.UNIVERSAL);
    }
}
