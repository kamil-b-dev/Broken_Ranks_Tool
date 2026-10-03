package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManagerFactory;
import java.util.ArrayList;
import java.util.stream.Collectors;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

@SpringBootTest(
        properties = {
            "spring.jpa.show-sql=false",
            "spring.jpa.properties.hibernate.generate_statistics=true",
            "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF"
        })
class ItemTemplateQueryTests {
    @Autowired private ItemTemplateRepository repository;
    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    void loadsSelectedItemsAndAllClassAssignmentsInOneQuery() {
        var catalog = repository.findAll();
        var selected =
                new ArrayList<>(
                        catalog.stream()
                                .filter(item -> !item.getAllowedClasses().isEmpty())
                                .limit(3)
                                .toList());
        selected.add(
                catalog.stream()
                        .filter(item -> item.getAllowedClasses().isEmpty())
                        .findFirst()
                        .orElseThrow());
        var expectedClasses =
                selected.stream()
                        .collect(
                                Collectors.toMap(
                                        ItemTemplate::getId, ItemTemplate::getAllowedClasses));
        var ids = new ArrayList<>(expectedClasses.keySet());
        ids.add(ids.getFirst());
        ids.add(Long.MAX_VALUE);
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        var loaded = repository.findAllById(ids);

        assertThat(loaded).hasSize(selected.size());
        assertThat(
                        loaded.stream()
                                .collect(
                                        Collectors.toMap(
                                                ItemTemplate::getId,
                                                ItemTemplate::getAllowedClasses)))
                .isEqualTo(expectedClasses);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
    }
}
