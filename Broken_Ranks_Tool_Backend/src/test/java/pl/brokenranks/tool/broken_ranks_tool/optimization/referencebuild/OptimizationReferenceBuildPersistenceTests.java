package pl.brokenranks.tool.broken_ranks_tool.optimization.referencebuild;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.BuildStateJsonHintLoader;
import pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile.FireMageBalancedEndgameFixture;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleBuildProfile;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
class OptimizationReferenceBuildPersistenceTests {
    @Autowired private OptimizationReferenceBuildRepository repository;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ItemTemplateRepository items;
    @Autowired private OptimizationContextFactory contextFactory;
    @Autowired private OptimizationResultAssembler resultAssembler;

    @Test
    void loadsVersionedFireMageMaximumMagicDamageBuild() throws Exception {
        OptimizationReferenceBuild reference =
                repository.findBySlugAndVersion("fire-mage-max-magic-damage", 1).orElseThrow();

        assertThat(reference.getName()).isEqualTo("Mag Ognia — maksymalny DMG magiczny");
        assertThat(reference.getProfession()).isEqualTo(SimpleBuildProfile.FIRE_MAGE);
        assertThat(reference.getStrategy()).isEqualTo(ReferenceBuildStrategy.MAXIMIZE_MAGIC_DAMAGE);
        assertThat(reference.getProofStatus()).isEqualTo(ReferenceBuildProofStatus.OPTIMAL);
        assertThat(reference.getDefinitionVersion()).isEqualTo(1);
        assertThat(reference.getEvaluatedAt())
                .isEqualTo(Instant.parse("2026-09-25T21:55:02.772980Z"));
        assertThat(reference.getPublishedOn()).isEqualTo(LocalDate.of(2026, 9, 26));
        assertThat(reference.getSolveTimeMs()).isEqualTo(103741);

        var objectives = objectMapper.readTree(reference.getObjectiveValues());
        assertThat(objectives.at("/lexicographic/0/type").asText()).isEqualTo("DAMAGE_MAGIC");
        assertThat(objectives.at("/lexicographic/0/value").asDouble()).isEqualTo(108.75);
        assertThat(objectives.at("/proof").asText()).isEqualTo("OPTIMAL");

        var build = objectMapper.readTree(reference.getBuildJson());
        assertThat(build.at("/format").asText()).isEqualTo("broken-ranks-tool-build");
        assertThat(build.at("/version").asInt()).isEqualTo(1);
        assertThat(build.at("/build/requestData/slots").size()).isEqualTo(12);
        assertThat(build.at("/build/requestData/slots/weapon/itemId").asLong()).isEqualTo(181);
        assertThat(build.at("/build/requestData/slots/ring1/itemId").asLong()).isEqualTo(160);
        assertThat(build.at("/build/requestData/slots/ring2/itemId").asLong()).isEqualTo(160);
    }

    @Test
    void loadsBalancedFireMageAsBestKnownWithoutClaimingFullOptimum() throws Exception {
        OptimizationReferenceBuild reference =
                repository.findBySlugAndVersion("fire-mage-balanced", 1).orElseThrow();

        assertThat(reference.getName()).isEqualTo("Mag Ognia — zrównoważony");
        assertThat(reference.getStrategy()).isEqualTo(ReferenceBuildStrategy.BALANCED_DEFENSE);
        assertThat(reference.getProofStatus()).isEqualTo(ReferenceBuildProofStatus.BEST_KNOWN);

        var objectives = objectMapper.readTree(reference.getObjectiveValues());
        assertThat(objectives.at("/values/magicDamage").asDouble()).isEqualTo(99.2525);
        assertThat(objectives.at("/values/rangedHitChance").asDouble()).isEqualTo(140.8525);
        assertThat(objectives.at("/values/mentalDefense").asDouble()).isEqualTo(50.025);
        assertThat(objectives.at("/proof").asText()).isEqualTo("BEST_KNOWN");
        assertThat(objectives.at("/provenObjectives").isEmpty()).isTrue();
        assertThat(objectives.at("/manualOverride/toDrifId").asLong()).isEqualTo(40L);
        assertThat(objectives.at("/manualOverride/index").asInt()).isEqualTo(2);
        assertThat(objectives.at("/manualOverride/slot").asText()).isEqualTo("boots");
        assertThat(objectives.at("/unmetRequirements/MANA_USAGE_REDUCTION/actualCount").asInt())
                .isZero();

        var build = objectMapper.readTree(reference.getBuildJson());
        assertThat(build.at("/build/requestData/slots").size()).isEqualTo(12);
        assertThat(build.at("/build/requestData/slots/boots/drifIds/2").asLong()).isEqualTo(40L);
        assertThat(build.at("/build/requestData/slots/boots/drifLevels/2").asInt()).isEqualTo(21);
        assertThat(build.at("/build/requestData/slots/shield/drifIds/1").asLong()).isEqualTo(56L);
        assertThat(build.at("/build/requestData/slots/shield/drifLevels/1").asInt()).isEqualTo(6);
        assertThat(build.at("/build/requestData/slots/shield/drifIds/2").asLong()).isEqualTo(108L);
        assertThat(build.at("/build/requestData/slots/shield/drifLevels/2").asInt()).isEqualTo(16);
    }

    @Test
    void restoresStoredBalancedBuildAndKeepsItsManualProfileDeviationExplicit() throws Exception {
        OptimizationReferenceBuild reference =
                repository.findBySlugAndVersion("fire-mage-balanced", 1).orElseThrow();
        var fixture = new FireMageBalancedEndgameFixture(items);
        var context = contextFactory.create(fixture.request(), 1, 1, 1);

        var hint =
                new BuildStateJsonHintLoader(objectMapper).load(reference.getBuildJson(), context);

        assertThat(resultAssembler.validateFinalResult(hint, context))
                .isEqualTo("Końcowy wynik nie spełnia limitów ilościowych.");
        assertThat(hint.slots()).hasSize(12);
        assertThat(
                        hint.slots().values().stream()
                                .flatMap(java.util.Collection::stream)
                                .filter(java.util.Objects::nonNull))
                .isNotEmpty();
    }
}
