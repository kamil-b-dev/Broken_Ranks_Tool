package pl.brokenranks.tool.broken_ranks_tool.progressionpath.planning;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionTargetRequest;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.model.ProgressionStage;

/** Builds a small set of catalog milestones, with a separate epic-to-legendary weapon route. */
public final class ProgressionEquipmentSequence {
    private final CalculationContext context;
    private final EquipmentPlacementRules placement;

    public ProgressionEquipmentSequence(
            CalculationContext context, EquipmentPlacementRules placement) {
        this.context = context;
        this.placement = placement;
    }

    public List<ProgressionStage> generate(ProgressionTargetRequest input) {
        var target =
                new ProgressionStage("target", input.targetLevel(), input.targetEquipment())
                        .equipment();
        var routes = new TreeMap<String, NavigableMap<Integer, ItemTemplate>>();
        var milestones = new TreeSet<Integer>();
        milestones.add(1);
        milestones.add(input.targetLevel());
        for (var entry : target.getSlots().entrySet()) {
            if (entry.getValue().getItemId() == null) continue;
            var goal = context.items().get(entry.getValue().getItemId());
            if (goal == null) throw new IllegalArgumentException("Nieznany przedmiot docelowy.");
            int goalLevel = plannedLevel(entry.getKey(), goal);
            if (goalLevel > input.targetLevel())
                throw new IllegalArgumentException(
                        "Ścieżka z przedmiotem "
                                + goal.getName()
                                + " wymaga poziomu celu co najmniej "
                                + goalLevel
                                + ".");
            var route =
                    route(entry.getKey(), goal, input.characterClass(), input.minItemLevelGap());
            routes.put(entry.getKey(), route);
            milestones.addAll(route.keySet());
        }
        var result = new ArrayList<ProgressionStage>();
        EquipmentRequest previous = null;
        for (int level : milestones) {
            if (level > input.targetLevel()) continue;
            var equipment = new EquipmentRequest();
            equipment.setSlots(new LinkedHashMap<>());
            equipment.setCharacterStats(
                    characterStats(target.getCharacterStats(), input.targetLevel(), level));
            for (var entry : target.getSlots().entrySet()) {
                var data = emptySlot();
                var route = routes.get(entry.getKey());
                var selected = route == null ? null : route.floorEntry(level);
                if (selected != null) {
                    var item = selected.getValue();
                    data.setItemId(item.getId());
                    // Only the final catalog successor gets planned stars. Exact target stars
                    // are restored at the last milestone, including atypical user builds.
                    boolean finalItem = Objects.equals(item.getId(), entry.getValue().getItemId());
                    boolean endgame =
                            context.items().values().stream()
                                    .noneMatch(
                                            other ->
                                                    available(other, input.characterClass())
                                                            && placement.isValidItem(
                                                                    other, entry.getKey())
                                                            && matchesProfile(
                                                                    other,
                                                                    item,
                                                                    input.characterClass())
                                                            && other.getReqLevel()
                                                                    > item.getReqLevel()
                                                            && dominates(other, item));
                    boolean epicWeapon =
                            entry.getKey().equals("weapon") && item.getRarity() == RARITY.EPIC;
                    data.setItemStars(
                            epicWeapon
                                    ? finalItem ? stars(entry.getValue()) : 9
                                    : finalItem && endgame ? stars(entry.getValue()) : 1);
                    builtIns(item, data);
                    if (finalItem
                            && (item.getRarity() == RARITY.EPIC
                                    || item.getRarity() == RARITY.SET)) {
                        data.setDrifIds(
                                entry.getValue().getDrifIds() == null
                                        ? new ArrayList<>()
                                        : new ArrayList<>(entry.getValue().getDrifIds()));
                        data.setDrifLevels(
                                entry.getValue().getDrifLevels() == null
                                        ? new LinkedHashMap<>()
                                        : new LinkedHashMap<>(entry.getValue().getDrifLevels()));
                    }
                }
                equipment.getSlots().put(entry.getKey(), data);
            }
            var oldWeapon = previous == null ? null : previous.getSlots().get("weapon");
            var newWeapon = equipment.getSlots().get("weapon");
            if (isLegendUpgrade(oldWeapon, newWeapon)) {
                // The epic already has nine stars from acquisition; the legend resets to one.
                int desiredStars = stars(newWeapon);
                newWeapon.setItemStars(1);
                add(result, level, equipment);
                equipment = copy(equipment, level);
                equipment.getSlots().get("weapon").setItemStars(desiredStars);
                if (desiredStars != 1) add(result, level, equipment);
            } else {
                add(result, level, equipment);
            }
            previous = equipment;
        }
        // Never project away a supplied target stone, level, star or character statistic.
        add(result, input.targetLevel(), target);
        return List.copyOf(result);
    }

    private NavigableMap<Integer, ItemTemplate> route(
            String key, ItemTemplate goal, CHARACTER_CLASS cls, int minItemLevelGap) {
        var route = new TreeMap<Integer, ItemTemplate>();
        ItemTemplate epic = null;
        if (key.equals("weapon") && goal.getRarity() == RARITY.LEGENDARY) {
            epic =
                    context.items().values().stream()
                            .filter(item -> item.getRarity() == RARITY.EPIC && available(item, cls))
                            .filter(item -> item.getName().equals(goal.getName()))
                            .filter(item -> plannedLevel(key, item) < plannedLevel(key, goal))
                            .min(Comparator.comparing(ItemTemplate::getId))
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "Brak epika poprzedzającego legendę "
                                                            + goal.getName()
                                                            + "."));
        }
        int cutoff = plannedLevel(key, epic == null ? goal : epic);
        var candidates =
                context.items().values().stream()
                        .filter(item -> available(item, cls) && placement.isValidItem(item, key))
                        .filter(item -> item.getRarity() == RARITY.RARE)
                        .filter(item -> item.getReqLevel() >= 1 && item.getReqLevel() < cutoff - 3)
                        .filter(item -> matchesProfile(item, goal, cls))
                        .sorted(
                                Comparator.comparingInt(ItemTemplate::getReqLevel)
                                        .thenComparing(ItemTemplate::getId))
                        .toList();
        // Near-level alternatives are compared together instead of suggesting two purchases
        // one or two levels apart. This three-level window is a planner heuristic, not a game rule.
        for (int index = 0; index < candidates.size(); ) {
            int start = candidates.get(index).getReqLevel();
            var group = new ArrayList<ItemTemplate>();
            while (index < candidates.size() && candidates.get(index).getReqLevel() <= start + 3)
                group.add(candidates.get(index++));
            var selected =
                    group.stream()
                            .max(
                                    Comparator.comparingInt(
                                                    (ItemTemplate item) ->
                                                            item.getProfile() == goal.getProfile()
                                                                    ? 1
                                                                    : 0)
                                            .thenComparingDouble(item -> affinity(item, goal))
                                            .thenComparing(
                                                    Comparator.comparingInt(
                                                                    ItemTemplate::getReqLevel)
                                                            .reversed())
                                            .thenComparing(
                                                    Comparator.comparing(ItemTemplate::getId)
                                                            .reversed()))
                            .orElseThrow();
            route.put(selected.getReqLevel(), selected);
        }
        if (epic != null) route.put(plannedLevel(key, epic), epic);
        route.put(plannedLevel(key, goal), goal);
        if (minItemLevelGap > 0) skipShortStages(route, goal, minItemLevelGap);
        return route;
    }

    private void skipShortStages(
            NavigableMap<Integer, ItemTemplate> route, ItemTemplate goal, int minimumGap) {
        Integer nextLevel = null;
        var iterator = route.descendingMap().entrySet().iterator();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            boolean required =
                    entry.getValue().getId().equals(goal.getId())
                            || entry.getValue().getRarity() == RARITY.EPIC;
            if (!required && nextLevel != null && nextLevel - entry.getKey() < minimumGap)
                iterator.remove();
            else nextLevel = entry.getKey();
        }
    }

    // Acquisition milestones belong to the progression plan, not catalog wear requirements.
    private int plannedLevel(String key, ItemTemplate item) {
        int acquisitionLevel =
                key.equals("weapon")
                        ? switch (item.getRarity()) {
                            case EPIC -> 120;
                            case LEGENDARY -> 140;
                            default -> 1;
                        }
                        : 1;
        return Math.max(acquisitionLevel, item.getReqLevel());
    }

    public boolean isLegendUpgrade(
            EquipmentRequest.SlotData before, EquipmentRequest.SlotData after) {
        if (before == null
                || after == null
                || before.getItemId() == null
                || after.getItemId() == null) return false;
        var a = context.items().get(before.getItemId());
        var b = context.items().get(after.getItemId());
        return a.getRarity() == RARITY.EPIC
                && b.getRarity() == RARITY.LEGENDARY
                && a.getName().equals(b.getName());
    }

    private boolean available(ItemTemplate item, CHARACTER_CLASS cls) {
        return item.getClassScope() == ITEM_CLASS_SCOPE.UNIVERSAL
                || item.getClassScope() == ITEM_CLASS_SCOPE.RESTRICTED
                        && item.getAllowedClasses() != null
                        && item.getAllowedClasses().contains(cls);
    }

    private boolean matchesProfile(ItemTemplate item, ItemTemplate goal, CHARACTER_CLASS cls) {
        if (item.getCategory().name().startsWith("WEAPON"))
            return item.getCategory() == goal.getCategory();
        var profile = goal.getProfile();
        if (profile != ITEM_PROFILE.MAGICAL && profile != ITEM_PROFILE.PHYSICAL)
            profile =
                    Set.of(CHARACTER_CLASS.FIRE_MAGE, CHARACTER_CLASS.DRUID, CHARACTER_CLASS.VOODOO)
                                    .contains(cls)
                            ? ITEM_PROFILE.MAGICAL
                            : ITEM_PROFILE.PHYSICAL;
        return item.getProfile() == profile || item.getProfile() == ITEM_PROFILE.UNIVERSAL;
    }

    private double affinity(ItemTemplate item, ItemTemplate goal) {
        if (goal.getStats() == null || item.getStats() == null) return 0;
        return goal.getStats().entrySet().stream()
                .filter(entry -> entry.getValue() > 0)
                .mapToDouble(
                        entry ->
                                Math.min(
                                        1,
                                        Math.max(
                                                        0,
                                                        item.getStats()
                                                                .getOrDefault(entry.getKey(), 0.0))
                                                / entry.getValue()))
                .sum();
    }

    private boolean dominates(ItemTemplate candidate, ItemTemplate item) {
        if (candidate.getStats() == null || item.getStats() == null) return false;
        boolean noLoss =
                item.getStats().entrySet().stream()
                        .filter(entry -> entry.getValue() > 0)
                        .allMatch(
                                entry ->
                                        candidate.getStats().getOrDefault(entry.getKey(), 0.0)
                                                >= entry.getValue());
        return noLoss
                && candidate.getStats().entrySet().stream()
                        .anyMatch(
                                entry ->
                                        entry.getValue()
                                                > item.getStats()
                                                        .getOrDefault(entry.getKey(), 0.0));
    }

    private void builtIns(ItemTemplate item, EquipmentRequest.SlotData slot) {
        if (item.getRarity() != RARITY.EPIC && item.getRarity() != RARITY.SET) return;
        for (String name :
                EquipmentRulesRegistry.EPIC_BUILTIN_DRIFS.getOrDefault(item.getName(), List.of())) {
            var template =
                    context.drifs().values().stream()
                            .filter(
                                    drif ->
                                            drif.getBonusType().name().equals(name)
                                                    && drif.getSize() == DRIF_SIZE.MAGNIDRIF)
                            .min(Comparator.comparing(DrifTemplate::getId))
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "Brak szablonu wbudowanego drifa "
                                                            + name
                                                            + "."));
            slot.getDrifLevels().put("" + slot.getDrifIds().size(), 16);
            slot.getDrifIds().add(template.getId());
        }
    }

    public static EquipmentRequest.SlotData emptySlot() {
        var slot = new EquipmentRequest.SlotData();
        slot.setOrbIds(new ArrayList<>());
        slot.setOrbLevels(new ArrayList<>());
        slot.setDrifIds(new ArrayList<>());
        slot.setDrifLevels(new LinkedHashMap<>());
        return slot;
    }

    private EquipmentRequest copy(EquipmentRequest equipment, int level) {
        return new ProgressionStage("copy", level, equipment).equipment();
    }

    private void add(List<ProgressionStage> stages, int level, EquipmentRequest equipment) {
        if (!stages.isEmpty()
                && stages.getLast().characterLevel() == level
                && stages.getLast().equipment().equals(equipment)) return;
        stages.add(new ProgressionStage("stage-" + stages.size(), level, equipment));
    }

    public static int stars(EquipmentRequest.SlotData slot) {
        return slot.getItemStars() == null ? 1 : slot.getItemStars();
    }

    /** Floors each target allocation proportionally; unspent points are kept, never invented. */
    public static Map<String, Integer> characterStats(
            Map<String, Integer> target, int targetLevel, int level) {
        if (target == null) return Map.of();
        if (level == targetLevel) return new LinkedHashMap<>(target);
        var result = new LinkedHashMap<String, Integer>();
        for (var entry : target.entrySet()) {
            boolean resource = Set.of("PŻ", "Mana", "Kondycja").contains(entry.getKey());
            if (!resource
                    && !Set.of("Siła", "Zręczność", "Moc", "Wiedza", "Inteligencja")
                            .contains(entry.getKey())) continue;
            int base = resource ? 200 : 10;
            int ratio = resource ? 10 : 1;
            int points = Math.max(0, (entry.getValue() - base) / ratio);
            int projected = targetLevel <= 1 ? 0 : points * (level - 1) / (targetLevel - 1);
            result.put(entry.getKey(), Math.min(entry.getValue(), base + projected * ratio));
        }
        return result;
    }
}
