package pl.brokenranks.tool.broken_ranks_tool.equipment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

@Repository
public interface DrifTemplateRepository extends JpaRepository<DrifTemplate, Long> {
}
