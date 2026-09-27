package pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleBuildProfile;

/** Immutable, versioned output of an offline optimization proof. */
@Getter
@Entity
@Table(
        name = "optimization_reference_builds",
        uniqueConstraints = @UniqueConstraint(columnNames = {"slug", "version"}))
public class OptimizationReferenceBuild {
    @Id private Long id;

    @Column(nullable = false)
    private String slug;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SimpleBuildProfile profession;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReferenceBuildStrategy strategy;

    @Enumerated(EnumType.STRING)
    @Column(name = "proof_status", nullable = false)
    private ReferenceBuildProofStatus proofStatus;

    @Column(name = "definition_version", nullable = false)
    private int definitionVersion;

    @Column(name = "evaluated_at", nullable = false)
    @Convert(converter = InstantTextConverter.class)
    private Instant evaluatedAt;

    @Column(name = "published_on", nullable = false)
    @Convert(converter = LocalDateTextConverter.class)
    private LocalDate publishedOn;

    @Column(nullable = false)
    private String solver;

    @Column(name = "solve_time_ms", nullable = false)
    private long solveTimeMs;

    @Lob
    @Column(name = "objective_values", nullable = false, columnDefinition = "TEXT")
    private String objectiveValues;

    @Lob
    @Column(name = "build_json", nullable = false, columnDefinition = "TEXT")
    private String buildJson;

    protected OptimizationReferenceBuild() {}
}
