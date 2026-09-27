package pl.brokenranks.tool.broken_ranks_tool.optimization.reference.profile;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.BuildConfigurationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationMode;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Frozen, developer-reviewed endgame equipment and drif goals for the Fire Mage oracle. */
public final class FireMageEndgameFixture {
    private static final int MAX_DRIFS = 12;

    private final ItemTemplateRepository items;

    public FireMageEndgameFixture(ItemTemplateRepository items) {
        this.items = items;
    }

    public OptimizationRequest request() {
        List<ItemTemplate> catalog = items.findAll();
        Map<String, EquipmentRequest.SlotData> slots = new LinkedHashMap<>();
        slots.put("weapon", slot(resolve(catalog, "Żmij", "XII", RARITY.LEGENDARY)));
        slots.put("shield", slot(resolve(catalog, "Ariarchy")));
        slots.put("armor", slot(resolve(catalog, "Zalla")));
        slots.put("helmet", slot(resolve(catalog, "Miłość Morany")));
        slots.put("cape", slot(resolve(catalog, "Cień Tarula")));
        slots.put("legs", slot(resolve(catalog, "Temary")));
        slots.put("boots", slot(resolve(catalog, "Envile")));
        slots.put("gloves", slot(resolve(catalog, "Voglery")));
        slots.put("belt", slot(resolve(catalog, "Wyrok Hellara")));
        slots.put("necklace", slot(resolve(catalog, "Ortasis")));
        ItemTemplate gift = resolve(catalog, "Dar Skrzydlatej");
        slots.put("ring1", slot(gift));
        slots.put("ring2", slot(gift));

        OptimizationRequest request = new OptimizationRequest();
        request.setMode(OptimizationMode.BUILD_FROM_SCRATCH);
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setOriginalSlots(slots);
        request.setCharacterStats(Map.of());
        request.setPriorities(priorities());
        request.setTargetQuantities(quantities());
        request.setDrifSizeQuantities(Map.of());
        request.setForcedPercentageTargets(minimumValues());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(
                new LinkedHashSet<>(
                        List.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED)));
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setGenerateVariants(false);
        return request;
    }

    public Map<DRIF_BONUS_TYPE, Double> minimumValues() {
        Map<DRIF_BONUS_TYPE, Double> result = new LinkedHashMap<>();
        result.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 120.0);
        result.put(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, 9.5);
        result.put(
                DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE,
                capMinusOne(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE));
        result.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, capMinusOne(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        result.put(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, capMinusOne(DRIF_BONUS_TYPE.DAMAGE_REDUCTION));
        result.put(
                DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE,
                capMinusOne(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE));
        return result;
    }

    public List<DRIF_BONUS_TYPE> maximizationOrder() {
        return List.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED);
    }

    private Map<DRIF_BONUS_TYPE, Integer> priorities() {
        Map<DRIF_BONUS_TYPE, Integer> result = new LinkedHashMap<>();
        quantities().keySet().forEach(type -> result.put(type, 1));
        return result;
    }

    private Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> quantities() {
        Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> result = new LinkedHashMap<>();
        flexible(result, DRIF_BONUS_TYPE.DAMAGE_MAGIC);
        flexible(result, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED);
        flexible(result, DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE);
        flexible(result, DRIF_BONUS_TYPE.CRITICAL_CHANCE);
        flexible(result, DRIF_BONUS_TYPE.DAMAGE_REDUCTION);
        flexible(result, DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE);
        result.put(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, exact(1));
        result.put(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION, exact(1));
        result.put(DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION, exact(1));
        result.put(DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, range(1, MAX_DRIFS));
        result.put(DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION, range(1, MAX_DRIFS));
        return result;
    }

    private void flexible(
            Map<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> result, DRIF_BONUS_TYPE type) {
        result.put(type, range(0, MAX_DRIFS));
    }

    private OptimizationRequest.QuantityRange exact(int count) {
        return range(count, count);
    }

    private OptimizationRequest.QuantityRange range(int minimum, int maximum) {
        return new OptimizationRequest.QuantityRange(minimum, maximum);
    }

    private double capMinusOne(DRIF_BONUS_TYPE type) {
        if (type.getMaxCap() == null) throw new IllegalArgumentException(type + " has no cap");
        return Math.abs(type.getMaxCap()) - 1.0;
    }

    private EquipmentRequest.SlotData slot(ItemTemplate item) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(item.getId());
        slot.setItemStars(9);
        slot.setOrbIds(List.of());
        slot.setOrbLevels(List.of());
        slot.setDrifIds(List.of());
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    private ItemTemplate resolve(List<ItemTemplate> catalog, String name) {
        List<ItemTemplate> matches =
                catalog.stream().filter(item -> name.equals(item.getName())).toList();
        if (matches.size() != 1) {
            throw new IllegalStateException(
                    "Expected one item named " + name + ", found " + describe(matches));
        }
        return matches.getFirst();
    }

    private ItemTemplate resolve(
            List<ItemTemplate> catalog, String name, String tier, RARITY rarity) {
        List<ItemTemplate> matches =
                catalog.stream()
                        .filter(item -> name.equals(item.getName()))
                        .filter(item -> tier.equalsIgnoreCase(item.getTier()))
                        .filter(item -> rarity == item.getRarity())
                        .toList();
        if (matches.size() != 1) {
            List<ItemTemplate> named =
                    catalog.stream().filter(item -> name.equals(item.getName())).toList();
            throw new IllegalStateException(
                    "Expected one "
                            + rarity
                            + " "
                            + name
                            + " tier "
                            + tier
                            + ", found matching="
                            + describe(matches)
                            + ", named="
                            + describe(named));
        }
        return matches.getFirst();
    }

    private String describe(List<ItemTemplate> matches) {
        return matches.stream()
                .map(
                        item ->
                                item.getId()
                                        + ":"
                                        + item.getName()
                                        + "/"
                                        + item.getRarity()
                                        + "/"
                                        + item.getTier())
                .toList()
                .toString();
    }
}
