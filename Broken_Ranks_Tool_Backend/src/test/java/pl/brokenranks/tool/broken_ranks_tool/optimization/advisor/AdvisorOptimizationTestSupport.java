package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.EquipmentStatsCalculatorTestFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

/** Shared real-calculator fixture for advisor integration scenarios. */
abstract class AdvisorOptimizationTestSupport {
    protected static final DRIF_BONUS_TYPE A = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    protected static final DRIF_BONUS_TYPE B = DRIF_BONUS_TYPE.CC_PROTECTION;

    protected static OptimizationRequest request(
            DRIF_BONUS_TYPE goal, Map<String, SlotData> slots) {
        OptimizationRequest request = new OptimizationRequest();
        request.setMode(OptimizationMode.ADVISOR);
        request.setOriginalSlots(slots);
        request.setPriorities(Map.of(goal, 30));
        AdvisorOptions options = new AdvisorOptions();
        options.setGoal(goal);
        options.setMaxActions(1);
        options.getAllowedChanges().setStars(false);
        request.setAdvisor(options);
        return request;
    }

    protected static SlotData slot(long item, int stars, Long... drifs) {
        SlotData slot = new SlotData();
        slot.setItemId(item);
        slot.setItemStars(stars);
        slot.setDrifIds(new ArrayList<>(Arrays.asList(drifs)));
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    protected static ItemTemplate item(
            long id, ITEM_CATEGORY category, String tier, int capacity, double bonus) {
        return ItemTemplate.builder()
                .id(id)
                .name("Item " + id)
                .category(category)
                .tier(tier)
                .capacity(capacity)
                .rarity(RARITY.RARE)
                .stats(Map.of("Bonus drify", bonus))
                .build();
    }

    protected static DrifTemplate drif(long id, DRIF_BONUS_TYPE type, String value) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.SUBDRIF)
                .bonusType(type)
                .baseValue(value)
                .increment("0%")
                .build();
    }

    protected Fixture fixture(List<ItemTemplate> items, List<DrifTemplate> drifs) {
        ItemTemplateRepository itemRepo = mock(ItemTemplateRepository.class);
        DrifTemplateRepository drifRepo = mock(DrifTemplateRepository.class);
        OrbTemplateRepository orbRepo = mock(OrbTemplateRepository.class);
        when(itemRepo.findAll()).thenReturn(items);
        when(itemRepo.findAllById(any())).thenReturn(items);
        when(drifRepo.findAll()).thenReturn(drifs);
        when(drifRepo.findAllById(any())).thenReturn(drifs);
        when(orbRepo.findAll()).thenReturn(List.of());
        when(orbRepo.findAllById(any())).thenReturn(List.of());
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        EquipmentPlacementRules placement = new EquipmentPlacementRules(rules);
        UpgradeLevelPolicy levels = new UpgradeLevelPolicy();
        ItemStatProcessor itemProcessor = new ItemStatProcessor(mock(RandomProvider.class));
        OrbStatProcessor orbProcessor =
                new OrbStatProcessor(placement, levels, new OrbSecurityValidator());
        DrifValueCalculator values = new DrifValueCalculator();
        EquipmentStatsCalculatorService calculator =
                spy(
                        EquipmentStatsCalculatorTestFactory.create(
                                new EquipmentDataProvider(itemRepo, orbRepo, drifRepo),
                                new EquipmentRequestValidator(),
                                placement,
                                levels,
                                new DrifSecurityValidator(placement, levels),
                                itemProcessor,
                                orbProcessor,
                                new DrifStatProcessor(placement, levels, rules, values),
                                new DrifCounter(placement),
                                new CalculationMetadataFactory(),
                                new SlotDrifSelectionFactory()));
        AdvisorRunRegistry runs = new AdvisorRunRegistry();
        return new Fixture(
                new AdvisorOptimizationService(
                        itemRepo,
                        drifRepo,
                        orbRepo,
                        placement,
                        levels,
                        rules,
                        itemProcessor,
                        orbProcessor,
                        values,
                        calculator,
                        runs),
                itemRepo,
                calculator,
                runs);
    }

    protected static final class Fixture {
        final AdvisorOptimizationService service;
        final ItemTemplateRepository items;
        final EquipmentStatsCalculatorService calculator;
        final AdvisorRunRegistry runs;

        Fixture(
                AdvisorOptimizationService service,
                ItemTemplateRepository items,
                EquipmentStatsCalculatorService calculator,
                AdvisorRunRegistry runs) {
            this.service = service;
            this.items = items;
            this.calculator = calculator;
            this.runs = runs;
        }
    }
}
