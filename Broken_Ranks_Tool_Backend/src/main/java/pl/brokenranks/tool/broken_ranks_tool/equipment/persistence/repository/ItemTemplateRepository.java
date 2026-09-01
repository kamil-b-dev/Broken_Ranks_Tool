package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

@Repository
public interface ItemTemplateRepository extends JpaRepository<ItemTemplate, Long> {
    @Override
    @EntityGraph(attributePaths = "allowedClasses")
    List<ItemTemplate> findAll();

    @EntityGraph(attributePaths = "allowedClasses")
    List<ItemTemplate> findByCategory(ITEM_CATEGORY category);
}
