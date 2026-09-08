package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlot;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.CalculationState;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Request-local template and contribution caches; no catalog queries inside search. */
final class AdvisorEquipmentModel {
    static final DRIF_BONUS_TYPE[] TYPES = DRIF_BONUS_TYPE.values();
    final CalculationContext templates;
    final OptimizationRequest request;
    final EquipmentPlacementRules placement;
    final UpgradeLevelPolicy levels;
    private final EquipmentRulesRegistry rules;
    private final ItemStatProcessor items;
    private final OrbStatProcessor orbs;
    private final DrifValueCalculator values;
    private final Map<String, Contribution> contributions = new HashMap<>();
    private final Map<String, double[]> equipmentValues = new HashMap<>();
    private final Map<String, Double> drifValues = new HashMap<>();

    AdvisorEquipmentModel(
            CalculationContext templates,
            OptimizationRequest request,
            EquipmentPlacementRules placement,
            UpgradeLevelPolicy levels,
            EquipmentRulesRegistry rules,
            ItemStatProcessor items,
            OrbStatProcessor orbs,
            DrifValueCalculator values) {
        this.templates = templates;
        this.request = request;
        this.placement = placement;
        this.levels = levels;
        this.rules = rules;
        this.items = items;
        this.orbs = orbs;
        this.values = values;
    }

    double[] evaluate(Map<String, SlotData> slots) {
        double[] result = new double[TYPES.length];
        double[] raw = new double[TYPES.length];
        int[] counts = new int[TYPES.length];
        result[DRIF_BONUS_TYPE.CRITICAL_CHANCE.ordinal()] = 2;
        result[DRIF_BONUS_TYPE.MANA_REGEN.ordinal()] = 5;
        result[DRIF_BONUS_TYPE.STAMINA_REGEN.ordinal()] = 5;
        for (var entry : slots.entrySet()) {
            Contribution c = contribution(entry.getKey(), entry.getValue());
            for (int i = 0; i < TYPES.length; i++) {
                result[i] += c.base()[i];
                raw[i] += c.drifs()[i];
                counts[i] += c.counts()[i];
            }
        }
        for (int i = 0; i < TYPES.length; i++)
            result[i] += raw[i] * rules.getDrifPenalty(counts[i]);
        return result;
    }

    private Contribution contribution(String key, SlotData slot) {
        String signature = slotSignature(key, slot);
        Contribution cached = contributions.get(signature);
        if (cached != null) return cached;
        ItemTemplate item = item(slot);
        String equipmentKey =
                key
                        + ":"
                        + slot.getItemId()
                        + ":"
                        + stars(slot)
                        + ":"
                        + slot.getOrbIds()
                        + ":"
                        + slot.getOrbLevels();
        double[] base =
                equipmentValues.computeIfAbsent(
                        equipmentKey,
                        ignored -> {
                            CalculationState state = new CalculationState(templates);
                            items.process(item, stars(slot), state);
                            orbs.process(key, slot, item, stars(slot), state);
                            return numeric(state.getAccumulator().getNumericResults());
                        });
        double[] raw = new double[TYPES.length];
        int[] counts = new int[TYPES.length];
        double multiplier = 1 + items.calculateFinalDrifMod(item, stars(slot));
        for (int i = 0; i < size(slot); i++) {
            Long id = id(slot, i);
            if (id == null) continue;
            DrifTemplate drif = templates.drifs().get(id);
            int level = level(slot, i);
            double value =
                    drifValues.computeIfAbsent(
                            id + "@" + level,
                            ignored ->
                                    parse(
                                            values.calculate(
                                                    drif.getBaseValue(),
                                                    drif.getIncrement(),
                                                    level)));
            int type = drif.getBonusType().ordinal();
            raw[type] += value * multiplier;
            counts[type]++;
        }
        Contribution result = new Contribution(base, raw, counts);
        if (contributions.size() < 12000) contributions.put(signature, result);
        return result;
    }

    boolean valid(Map<String, SlotData> slots) {
        Set<ORB_BONUS_TYPE> used = new HashSet<>();
        for (var entry : slots.entrySet()) {
            if (!validSlot(entry.getKey(), entry.getValue())) return false;
            if (entry.getValue().getOrbIds() != null) {
                for (Long id : entry.getValue().getOrbIds()) {
                    if (id != null && !used.add(templates.orbs().get(id).getBonusType()))
                        return false;
                }
            }
        }
        return true;
    }

    boolean validSlot(String key, SlotData slot) {
        ItemTemplate item = item(slot);
        if (!placement.isValidItem(item, key)) return false;
        if (stars(slot) < 1 || stars(slot) > 9) return false;
        Set<DRIF_BONUS_TYPE> types = new HashSet<>();
        int count = 0, power = 0, elements = 0;
        List<String> builtins =
                EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(
                        Objects.toString(item.getName(), "").replaceFirst("\\s+[IVX]+$", ""),
                        List.of());
        for (int i = 0; i < size(slot); i++) {
            if (id(slot, i) == null) continue;
            DrifTemplate drif = templates.drifs().get(id(slot, i));
            if (!placement.isValidDrif(drif)
                    || drif.getSize() == null
                    || !types.add(drif.getBonusType())
                    || level(slot, i) < 1
                    || level(slot, i) > drif.getSize().getMaxLevel()) return false;
            if (special(slot)) {
                if (drif.getSize() != DRIF_SIZE.MAGNIDRIF
                        || i >= builtins.size()
                        || !builtins.get(i).equals(drif.getBonusType().name())) return false;
            } else if (!placement.isValidDrifSizeForTier(drif, item)
                    || !placement.isElementalDrifPositionValid(drif, key)) return false;
            if (placement.isElementalDamage(drif.getBonusType())) elements++;
            count++;
            power += DrifPowerRules.power(drif.getBonusType().getBasePower(), level(slot, i));
            if (!special(slot) && i >= maxDrifs(slot)) return false;
        }
        if (!special(slot)
                && (count > maxDrifs(slot)
                        || elements > 1
                        || power > levels.calculateItemCapacity(item, stars(slot)))) return false;
        List<Long> orbIds = slot.getOrbIds() == null ? List.of() : slot.getOrbIds();
        if (orbIds.size() > (item.getRarity() == RARITY.LEGENDARY ? 2 : 1)) return false;
        Set<ORB_BONUS_TYPE> orbTypes = new HashSet<>();
        boolean gap = false;
        for (int i = 0; i < orbIds.size(); i++) {
            if (orbIds.get(i) == null) {
                gap = true;
                continue;
            }
            OrbTemplate orb = templates.orbs().get(orbIds.get(i));
            int level = orbLevel(slot, i);
            if (gap
                    || !placement.isValidOrb(orb, key, item, i > 0)
                    || orb.getSize() == null
                    || level < 1
                    || level > orb.getSize().getMaxLevel()
                    || !orbTypes.add(orb.getBonusType())) return false;
        }
        return true;
    }

    int maxDrifs(SlotData slot) {
        if (special(slot)) return 0;
        int tier =
                RomanNumeralParser.convertRomanToInteger(
                        Objects.toString(item(slot).getTier(), "I"));
        return tier >= 10 ? 3 : tier >= 4 || ((tier == 2 || tier == 3) && stars(slot) >= 7) ? 2 : 1;
    }

    boolean locked(String key) {
        return request.getLockedSlots() != null && request.getLockedSlots().contains(key);
    }

    boolean movable(String key, SlotData slot, int index) {
        return !locked(key)
                && !special(slot)
                && (request.getLockedDrifs() == null
                        || !request.getLockedDrifs().getOrDefault(key, Set.of()).contains(index));
    }

    boolean special(SlotData slot) {
        ItemTemplate item = item(slot);
        return item != null && (item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET);
    }

    ItemTemplate item(SlotData slot) {
        return slot == null ? null : templates.items().get(slot.getItemId());
    }

    static int stars(SlotData slot) {
        return slot.getItemStars() == null || slot.getItemStars() == 0 ? 1 : slot.getItemStars();
    }

    static int size(SlotData slot) {
        return slot.getDrifIds() == null ? 0 : slot.getDrifIds().size();
    }

    static Long id(SlotData slot, int i) {
        return i < size(slot) ? slot.getDrifIds().get(i) : null;
    }

    static int level(SlotData slot, int i) {
        Integer requested =
                slot.getDrifLevels() == null ? 1 : slot.getDrifLevels().getOrDefault("" + i, 1);
        return requested == null ? 0 : requested;
    }

    static int orbLevel(SlotData slot, int i) {
        return slot.getOrbLevels() == null
                        || i >= slot.getOrbLevels().size()
                        || slot.getOrbLevels().get(i) == null
                ? 1
                : slot.getOrbLevels().get(i);
    }

    static SlotData placed(SlotData source, int index, Long id, int level) {
        SlotData slot = copySlot(source);
        if (slot.getDrifIds() == null) slot.setDrifIds(new ArrayList<>());
        if (slot.getDrifLevels() == null) slot.setDrifLevels(new HashMap<>());
        while (slot.getDrifIds().size() <= index) slot.getDrifIds().add(null);
        slot.getDrifIds().set(index, id);
        if (id == null) slot.getDrifLevels().remove("" + index);
        else slot.getDrifLevels().put("" + index, level);
        return slot;
    }

    static String signature(Map<String, SlotData> slots) {
        StringBuilder key = new StringBuilder();
        slots.forEach((name, slot) -> key.append(slotSignature(name, slot)).append('|'));
        return key.toString();
    }

    private static String slotSignature(String name, SlotData slot) {
        StringBuilder key =
                new StringBuilder(name)
                        .append(':')
                        .append(slot.getItemId())
                        .append(':')
                        .append(stars(slot))
                        .append(':')
                        .append(slot.getOrbIds())
                        .append(':')
                        .append(slot.getOrbLevels());
        int last = size(slot) - 1;
        while (last >= 0 && id(slot, last) == null) last--;
        for (int i = 0; i <= last; i++)
            key.append(':')
                    .append(id(slot, i))
                    .append('@')
                    .append(id(slot, i) == null ? 0 : level(slot, i));
        return key.toString();
    }

    EquipmentRequest setup(Map<String, SlotData> slots) {
        EquipmentRequest setup = new EquipmentRequest();
        setup.setSlots(slots);
        setup.setCharacterStats(request.getCharacterStats());
        return setup;
    }

    static double parse(String value) {
        if (value == null) return 0;
        return Double.parseDouble(value.replace("%", "").replace(',', '.').trim());
    }

    static double[] numeric(Map<String, Double> stats) {
        double[] result = new double[TYPES.length];
        for (var type : TYPES) result[type.ordinal()] = stats.getOrDefault(type.name(), 0.0);
        return result;
    }

    static double[] parsed(Map<String, String> stats) {
        double[] result = new double[TYPES.length];
        for (var type : TYPES) result[type.ordinal()] = parse(stats.get(type.name()));
        return result;
    }

    static double directed(DRIF_BONUS_TYPE type, double value) {
        return type.getMaxCap() != null && type.getMaxCap() < 0 ? -value : value;
    }

    private record Contribution(double[] base, double[] drifs, int[] counts) {}
}
