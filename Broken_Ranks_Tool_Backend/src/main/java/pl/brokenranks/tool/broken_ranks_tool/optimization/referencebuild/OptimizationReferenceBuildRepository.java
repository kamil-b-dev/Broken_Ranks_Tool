package pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Internal access to versioned oracle results stored in the read-only catalog. */
public interface OptimizationReferenceBuildRepository
        extends JpaRepository<OptimizationReferenceBuild, Long> {
    Optional<OptimizationReferenceBuild> findBySlugAndVersion(String slug, int version);
}
