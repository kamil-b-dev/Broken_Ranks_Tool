package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorEquipmentModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlot;

import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.AdvisorOptions;

/** Bounded, deterministic beam over short action plans, including compensating moves. */
final class AdvisorSearch {
    static final double EPSILON = 1e-8;
    final AdvisorEquipmentModel model;
    final AdvisorOptions options;
    final double[] baseline;
    final double[] minima = new double[TYPES.length];
    final double target;
    final AdvisorSearchControl control;
    final Comparator<Node> ranking;
    final AdvisorBeamPolicy beamPolicy = new AdvisorBeamPolicy();
    final Set<String> seen = new HashSet<>();
    final List<Node> finalists = new ArrayList<>();
    private final Map<String, List<ItemTemplate>> replacements = new HashMap<>();

    record Node(
            Map<String, SlotData> slots,
            double[] stats,
            List<String> actions,
            Set<String> changed,
            int upgrades,
            int effort) {
        int kind() {
            return Math.min(2, upgrades);
        }
    }

    AdvisorSearch(
            AdvisorEquipmentModel model,
            AdvisorOptions options,
            double[] baseline,
            long deadline,
            AtomicBoolean cancelled) {
        this.model = model;
        this.options = options;
        this.baseline = baseline;
        this.control = new AdvisorSearchControl(deadline, cancelled);
        Arrays.fill(minima, Double.NEGATIVE_INFINITY);
        for (var type : TYPES) {
            if (type == options.getGoal() || Math.abs(baseline[type.ordinal()]) < EPSILON) continue;
            var protection =
                    options.getProtectedModifiers() == null
                            ? null
                            : options.getProtectedModifiers().get(type);
            if (protection == null || protection.isEnabled()) {
                minima[type.ordinal()] =
                        directed(type, baseline[type.ordinal()])
                                - (protection == null ? 0 : protection.getLoss());
            }
        }
        target =
                options.getTargetValue() != null
                        ? options.getTargetValue()
                        : options.getTargetGain() != null
                                ? value(baseline) + options.getTargetGain()
                                : Double.POSITIVE_INFINITY;
        ranking =
                AdvisorPlanRanking.create(
                        target, node -> reached(node.stats()), node -> value(node.stats()));
    }

    List<Node> run(Map<String, SlotData> slots) {
        Node initial = new Node(slots, model.evaluate(slots), List.of(), Set.of(), 0, 0);
        seen.add(signature(slots));
        List<Node> beam = List.of(initial);
        for (int depth = 0; depth < options.getMaxActions() && running(); depth++) {
            List<Node> next = new ArrayList<>();
            for (Node node : beam) {
                if (!running()) break;
                neighbors(
                        node,
                        candidate -> {
                            if (!running() || !seen.add(signature(candidate.slots()))) return;
                            control.recordEvaluation();
                            Node scored =
                                    new Node(
                                            candidate.slots(),
                                            model.evaluate(candidate.slots()),
                                            candidate.actions(),
                                            candidate.changed(),
                                            candidate.upgrades(),
                                            candidate.effort());
                            // Allow slightly deficient intermediate plans: another move can
                            // compensate.
                            next.add(scored);
                            if (deficit(scored.stats()) <= 0.1 && gain(scored.stats()) > EPSILON)
                                finalists.add(scored);
                            if (next.size() > 300) trimBeam(next);
                            if (finalists.size() > 180) trimFinalists();
                        });
            }
            trimBeam(next);
            beam = next;
        }
        trimFinalists();
        return List.copyOf(finalists);
    }

    boolean running() {
        return control.running();
    }

    boolean limited() {
        return control.limited();
    }

    double value(double[] stats) {
        double raw = directed(options.getGoal(), stats[options.getGoal().ordinal()]);
        Integer cap = options.getGoal().getMaxCap();
        return cap == null ? raw : Math.min(raw, Math.abs(cap));
    }

    double gain(double[] stats) {
        return value(stats) - value(baseline);
    }

    boolean reached(double[] stats) {
        return value(stats) + EPSILON >= target;
    }

    double deficit(double[] stats) {
        double sum = 0;
        for (var type : TYPES)
            sum += Math.max(0, minima[type.ordinal()] - directed(type, stats[type.ordinal()]));
        return sum;
    }

    Comparator<Node> ranking() {
        return ranking;
    }

    private void trimBeam(List<Node> nodes) {
        beamPolicy.trimSearchBeam(
                nodes, ranking, node -> deficit(node.stats()), node -> gain(node.stats()));
    }

    private void trimFinalists() {
        beamPolicy.trimFinalists(finalists, ranking);
    }

    private void neighbors(Node node, Consumer<Node> accept) {
        List<String> keys = new ArrayList<>(node.slots().keySet());
        for (int a = 0; a < keys.size() && running(); a++) {
            String leftKey = keys.get(a);
            SlotData left = node.slots().get(leftKey);
            for (int b = a + 1; b < keys.size() && running(); b++) {
                String rightKey = keys.get(b);
                SlotData right = node.slots().get(rightKey);
                for (int i = 0; i < model.maxDrifs(left) && running(); i++) {
                    if (!model.movable(leftKey, left, i)) continue;
                    for (int j = 0; j < model.maxDrifs(right) && running(); j++) {
                        if (!model.movable(rightKey, right, j)) continue;
                        Long first = id(left, i), second = id(right, j);
                        if (Objects.equals(first, second)
                                && (first == null || level(left, i) == level(right, j))) continue;
                        SlotData nextLeft = placed(left, i, second, level(right, j));
                        SlotData nextRight = placed(right, j, first, level(left, i));
                        if (!model.validSlot(leftKey, nextLeft)
                                || !model.validSlot(rightKey, nextRight)) continue;
                        Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
                        next.put(leftKey, nextLeft);
                        next.put(rightKey, nextRight);
                        String label =
                                first == null
                                        ? "Przenieś "
                                                + drifLabel(second, level(right, j))
                                                + " z "
                                                + location(rightKey, j)
                                                + " do "
                                                + location(leftKey, i)
                                        : second == null
                                                ? "Przenieś "
                                                        + drifLabel(first, level(left, i))
                                                        + " z "
                                                        + location(leftKey, i)
                                                        + " do "
                                                        + location(rightKey, j)
                                                : "Zamień "
                                                        + drifLabel(first, level(left, i))
                                                        + " ("
                                                        + location(leftKey, i)
                                                        + ") z "
                                                        + drifLabel(second, level(right, j))
                                                        + " ("
                                                        + location(rightKey, j)
                                                        + ")";
                        accept.accept(child(node, next, label, null, 0, 0));
                    }
                }
            }
        }
        for (String key : keys) {
            if (!running()) return;
            if (model.locked(key)) continue;
            SlotData slot = node.slots().get(key);
            var allowed = options.getAllowedChanges();
            if (allowed.isStars() && !node.changed().contains("stars:" + key)) {
                for (int star = stars(slot) + 1; star <= 9 && running(); star++) {
                    SlotData next = copySlot(slot);
                    next.setItemStars(star);
                    emit(
                            node,
                            key,
                            next,
                            "Podnieś "
                                    + slotName(key)
                                    + " ("
                                    + model.item(slot).getName()
                                    + ") z "
                                    + stars(slot)
                                    + "★ do "
                                    + star
                                    + "★",
                            "stars:" + key,
                            star - stars(slot),
                            accept);
                }
            }
            if (allowed.isOrbs()) orbChanges(node, key, slot, accept);
            if (model.special(slot)) continue;
            if (allowed.isDrifs() || allowed.isDrifUpgrades()) drifChanges(node, key, slot, accept);
            if (allowed.isItems() && !node.changed().contains("item:" + key)) {
                for (ItemTemplate replacement :
                        replacements.computeIfAbsent(key, ignored -> itemCandidates(key, slot))) {
                    if (!running()) return;
                    if (replacement.getId().equals(slot.getItemId())) continue;
                    SlotData next = copySlot(slot);
                    next.setItemId(replacement.getId());
                    emit(
                            node,
                            key,
                            next,
                            "Zmień "
                                    + slotName(key)
                                    + ": "
                                    + model.item(slot).getName()
                                    + " → "
                                    + replacement.getName()
                                    + " ("
                                    + stars(slot)
                                    + "★)",
                            "item:" + key,
                            1,
                            accept);
                }
            }
        }
    }

    private void drifChanges(Node node, String key, SlotData slot, Consumer<Node> accept) {
        for (int i = 0; i < model.maxDrifs(slot) && running(); i++) {
            if (!model.movable(key, slot, i) || node.changed().contains("drif:" + key + ":" + i))
                continue;
            Long current = id(slot, i);
            if (current != null && options.getAllowedChanges().isDrifUpgrades()) {
                DrifTemplate drif = model.templates.drifs().get(current);
                for (int nextLevel = level(slot, i) + 1;
                        nextLevel <= drif.getSize().getMaxLevel() && running();
                        nextLevel++) {
                    emit(
                            node,
                            key,
                            placed(slot, i, current, nextLevel),
                            "Ulepsz "
                                    + drifLabel(current, level(slot, i))
                                    + " w "
                                    + location(key, i)
                                    + " do poziomu "
                                    + nextLevel,
                            "drif:" + key + ":" + i,
                            nextLevel - level(slot, i),
                            accept);
                }
            } else if (current == null && options.getAllowedChanges().isDrifs()) {
                for (DrifTemplate drif : model.templates.drifs().values()) {
                    if (!running()) return;
                    if (drif.getBonusType() != options.getGoal()
                            || !model.placement.isValidDrifSizeForTier(drif, model.item(slot)))
                        continue;
                    for (int nextLevel : new int[] {1, 6, 11, 16, 21}) {
                        if (nextLevel > drif.getSize().getMaxLevel()) continue;
                        emit(
                                node,
                                key,
                                placed(slot, i, drif.getId(), nextLevel),
                                "Dodaj "
                                        + drifLabel(drif.getId(), nextLevel)
                                        + " do "
                                        + location(key, i),
                                "drif:" + key + ":" + i,
                                1,
                                accept);
                    }
                }
            }
        }
    }

    private void orbChanges(Node node, String key, SlotData slot, Consumer<Node> accept) {
        int max = model.item(slot).getRarity() == RARITY.LEGENDARY ? 2 : 1;
        for (int i = 0; i < max && running(); i++) {
            if (node.changed().contains("orb:" + key + ":" + i)) continue;
            for (OrbTemplate orb : model.templates.orbs().values()) {
                if (!running()) return;
                // Orb-specific bonuses currently use separate statistic keys. They cannot
                // improve a drif goal or repair its protected modifiers, so skip them cheaply.
                if (Arrays.stream(TYPES)
                        .noneMatch(type -> type.name().equals(orb.getBonusType().name()))) continue;
                if (!model.placement.isValidOrb(orb, key, model.item(slot), i > 0)) continue;
                SlotData next = copySlot(slot);
                if (next.getOrbIds() == null) next.setOrbIds(new ArrayList<>());
                if (next.getOrbLevels() == null) next.setOrbLevels(new ArrayList<>());
                while (next.getOrbIds().size() <= i) next.getOrbIds().add(null);
                while (next.getOrbLevels().size() <= i) next.getOrbLevels().add(1);
                next.getOrbIds().set(i, orb.getId());
                next.getOrbLevels().set(i, orb.getSize().getMaxLevel());
                emit(
                        node,
                        key,
                        next,
                        "Ustaw orb "
                                + orb.getName()
                                + " (poziom "
                                + orb.getSize().getMaxLevel()
                                + ") w "
                                + slotName(key)
                                + ", miejsce "
                                + (i + 1),
                        "orb:" + key + ":" + i,
                        1,
                        accept);
            }
        }
    }

    private List<ItemTemplate> itemCandidates(String key, SlotData slot) {
        String profile = options.getProfession();
        if ("AUTO".equals(profile)) {
            double magical = 0, physical = 0;
            for (SlotData equipped : model.request.getOriginalSlots().values()) {
                ItemTemplate item = model.item(equipped);
                if (item == null || item.getStats() == null) continue;
                if (item.getProfile() == ITEM_PROFILE.MAGICAL) magical += 2;
                if (item.getProfile() == ITEM_PROFILE.PHYSICAL) physical += 2;
                magical +=
                        item.getStats().getOrDefault("Moc", 0.0)
                                + item.getStats().getOrDefault("Wiedza", 0.0);
                physical +=
                        item.getStats().getOrDefault("Siła", 0.0)
                                + item.getStats().getOrDefault("Zręczność", 0.0);
            }
            var character = model.request.getCharacterStats();
            if (character != null) {
                magical += character.getOrDefault("Moc", 0) + character.getOrDefault("Wiedza", 0);
                physical +=
                        character.getOrDefault("Siła", 0) + character.getOrDefault("Zręczność", 0);
            }
            profile =
                    magical == physical ? "UNIVERSAL" : magical > physical ? "MAGICAL" : "PHYSICAL";
        }
        String selected = profile;
        return model.templates.items().values().stream()
                .filter(
                        item ->
                                !item.getId().equals(slot.getItemId())
                                        && model.placement.isValidItem(item, key))
                .filter(item -> item.getRarity() != RARITY.EPIC && item.getRarity() != RARITY.SET)
                .filter(
                        item ->
                                item.getProfile() == ITEM_PROFILE.UNIVERSAL
                                        || item.getProfile() == ITEM_PROFILE.UNSPECIFIED
                                        || item.getProfile().name().equals(selected))
                .sorted(
                        Comparator.comparingDouble(
                                        (ItemTemplate item) ->
                                                (item.getStats() == null
                                                                        ? 0
                                                                        : item.getStats()
                                                                                .getOrDefault(
                                                                                        "Bonus drify",
                                                                                        0.0))
                                                                * 10
                                                        + model.levels.calculateItemCapacity(
                                                                item, stars(slot)))
                                .reversed()
                                .thenComparing(ItemTemplate::getId))
                .limit(3)
                .toList();
    }

    private void emit(
            Node node,
            String key,
            SlotData slot,
            String label,
            String change,
            int effort,
            Consumer<Node> accept) {
        if (!running()) return;
        Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
        next.put(key, slot);
        if (model.valid(next)) accept.accept(child(node, next, label, change, 1, effort));
    }

    private Node child(
            Node parent,
            Map<String, SlotData> slots,
            String label,
            String change,
            int upgrades,
            int effort) {
        List<String> actions = new ArrayList<>(parent.actions());
        actions.add(label);
        Set<String> changed = new HashSet<>(parent.changed());
        if (change != null) changed.add(change);
        return new Node(
                slots,
                null,
                actions,
                changed,
                parent.upgrades() + upgrades,
                parent.effort() + effort);
    }

    private String drifLabel(Long id, int level) {
        DrifTemplate drif = model.templates.drifs().get(id);
        return drif.getSize() + " " + drif.getName() + " " + level;
    }

    private static String location(String key, int index) {
        return slotName(key) + ", gniazdo " + (index + 1);
    }

    static String slotName(String key) {
        return switch (key) {
            case "helmet" -> "hełm";
            case "armor" -> "zbroja";
            case "cape" -> "peleryna";
            case "legs" -> "spodnie";
            case "boots" -> "buty";
            case "gloves" -> "rękawice";
            case "belt" -> "pas";
            case "necklace" -> "naszyjnik";
            case "ring1" -> "pierścień 1";
            case "ring2" -> "pierścień 2";
            case "weapon" -> "broń";
            case "shield" -> "druga ręka";
            default -> key;
        };
    }
}
