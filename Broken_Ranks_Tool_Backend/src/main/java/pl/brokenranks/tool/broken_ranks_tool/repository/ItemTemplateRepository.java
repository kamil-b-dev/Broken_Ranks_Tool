package pl.brokenranks.tool.broken_ranks_tool.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.templates.ItemTemplate;

import java.util.List;

@Repository
public interface ItemTemplateRepository extends JpaRepository<ItemTemplate, Long> {
    List<ItemTemplate> findByCategory(ITEM_CATEGORY category);
}