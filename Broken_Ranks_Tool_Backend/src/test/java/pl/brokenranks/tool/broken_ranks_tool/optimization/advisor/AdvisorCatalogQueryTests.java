package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.persistence.EntityManagerFactory;
import java.util.List;
import java.util.Map;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

@SpringBootTest(
        properties = {
            "spring.jpa.show-sql=false",
            "spring.jpa.properties.hibernate.generate_statistics=true",
            "logging.level.org.hibernate.engine.internal.StatisticalLoggingSessionEventListener=OFF"
        })
class AdvisorCatalogQueryTests {
    @Autowired private AdvisorOptimizationService advisor;
    @Autowired private EquipmentStatsCalculatorService calculator;
    @Autowired private ItemTemplateRepository items;
    @Autowired private DrifTemplateRepository drifs;
    @Autowired private OrbTemplateRepository orbs;
    @Autowired private EntityManagerFactory entityManagerFactory;

    @Test
    void allFinalistsShareThreeCatalogQueriesAndMatchFreshCalculatorResults() {
        var helmet =
                items.findAll().stream()
                        .filter(
                                item ->
                                        item.getCategory() == ITEM_CATEGORY.HELMET
                                                && item.getRarity() == RARITY.RARE
                                                && item.getCapacity() != null
                                                && item.getCapacity() >= 10)
                        .findFirst()
                        .orElseThrow();
        var drif =
                drifs.findAll().stream()
                        .filter(
                                stone ->
                                        stone.getBonusType() == DRIF_BONUS_TYPE.CRITICAL_CHANCE
                                                && stone.getSize() == DRIF_SIZE.SUBDRIF)
                        .findFirst()
                        .orElseThrow();
        var orb =
                orbs.findAll().stream()
                        .filter(
                                stone ->
                                        stone.getCategory() == ORB_CATEGORY.DEFENSIVE
                                                && stone.getSize() == ORB_SIZE.SUBORB)
                        .findFirst()
                        .orElseThrow();
        var slot = new SlotData();
        slot.setItemId(helmet.getId());
        slot.setItemStars(1);
        slot.setDrifIds(List.of(drif.getId()));
        slot.setDrifLevels(Map.of("0", 6));
        slot.setOrbIds(List.of(orb.getId()));
        slot.setOrbLevels(List.of(1));
        var request = new OptimizationRequest();
        request.setMode(OptimizationMode.ADVISOR);
        request.setOriginalSlots(Map.of("helmet", slot));
        request.setCharacterStats(Map.of("Siła", 100));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        var options = new AdvisorOptions();
        options.setGoal(DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        options.setMaxActions(1);
        request.setAdvisor(options);
        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();

        var result = advisor.optimize(request);

        assertTrue(result.getSummary().isSuccess(), result.getSummary().getMessage());
        assertTrue(result.getAdvisorReport().verifiedCandidates() > 1);
        assertEquals(3, statistics.getPrepareStatementCount());
        System.out.println(
                "ADVISOR_QUERY_BENCHMARK seconds="
                        + result.getSummary().getExecutionTimeSeconds()
                        + " queries="
                        + statistics.getPrepareStatementCount()
                        + " verified="
                        + result.getAdvisorReport().verifiedCandidates());
        assertEquals(
                calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
        for (var variant : result.getSummary().getNextVariants()) {
            assertEquals(
                    calculator.calculateWithSources(variant.setup()), variant.calculationResult());
        }
    }
}
