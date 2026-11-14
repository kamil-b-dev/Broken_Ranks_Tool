package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

@Repository
public interface DrifTemplateRepository extends JpaRepository<DrifTemplate, Long> {
    /** Loads owned templates and their bonus families in one request-local catalog query. */
    @Query(
            "select d from DrifTemplate d where d.id in :ownedIds or d.bonusType in "
                    + "(select owned.bonusType from DrifTemplate owned where owned.id in :ownedIds)")
    List<DrifTemplate> findUpgradeCandidatesByOwnedIds(
            @Param("ownedIds") Collection<Long> ownedIds);
}
