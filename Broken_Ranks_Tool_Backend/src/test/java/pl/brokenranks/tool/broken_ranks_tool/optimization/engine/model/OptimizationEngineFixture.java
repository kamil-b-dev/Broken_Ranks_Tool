package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.*;
import java.util.stream.Collectors;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Small, database-free states for testing engine stages with real evaluation. */
public final class OptimizationEngineFixture {
    private OptimizationEngineFixture() {}

    public static DrifTemplate drif(long id, DRIF_BONUS_TYPE type) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .bonusType(type)
                .size(DRIF_SIZE.SUBDRIF)
                .baseValue("2%")
                .increment("1%")
                .build();
    }

    public static SlotContext slot(
            String key,
            int capacity,
            int sockets,
            double bonus,
            boolean special,
            Set<Integer> locks,
            DrifTemplate... candidates) {
        ItemTemplate item =
                ItemTemplate.builder()
                        .id((long) key.hashCode())
                        .name(key)
                        .tier("X")
                        .rarity(special ? RARITY.EPIC : RARITY.RARE)
                        .capacity(capacity)
                        .build();
        EquipmentRequest.SlotData original = new EquipmentRequest.SlotData();
        original.setItemId(item.getId());
        original.setItemStars(1);
        return new SlotContext(
                key, original, item, capacity, sockets, bonus, List.of(candidates), locks, special);
    }

    public static OptimizationContext context(OptimizationRequest request, SlotContext... slots) {
        List<SlotContext> list = List.of(slots);
        Map<Long, DrifTemplate> drifs = new HashMap<>();
        list.forEach(slot -> slot.candidates().forEach(drif -> drifs.put(drif.getId(), drif)));
        return new OptimizationContext(
                request,
                list.stream().collect(Collectors.toMap(s -> s.item().getId(), SlotContext::item)),
                drifs,
                list,
                list.stream().collect(Collectors.groupingBy(SlotContext::drifBonus)),
                request.getPriorities().entrySet().stream()
                        .sorted(Map.Entry.<DRIF_BONUS_TYPE, Integer>comparingByValue().reversed())
                        .toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10000),
                new SearchBudget(10000),
                new SearchBudget(10000),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>());
    }

    public static OptimizationRequest request(DRIF_BONUS_TYPE... types) {
        OptimizationRequest request = new OptimizationRequest();
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        for (DRIF_BONUS_TYPE type : types) priorities.put(type, 10);
        request.setPriorities(priorities);
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        return request;
    }

    public static void put(BuildState state, String key, Placement... placements) {
        state.slots().put(key, new ArrayList<>(Arrays.asList(placements)));
    }
}
