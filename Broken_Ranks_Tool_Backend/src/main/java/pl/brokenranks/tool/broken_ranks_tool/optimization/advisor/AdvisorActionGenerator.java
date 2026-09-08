package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorEquipmentModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlot;

import java.util.*;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;

/** Generates valid neighboring equipment configurations for a search node. */
final class AdvisorActionGenerator {
    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final Map<String, List<ItemTemplate>> replacements = new HashMap<>();

    AdvisorActionGenerator(AdvisorSearch search) {
        this.search = search;
        this.model = search.model;
    }

    void generate(AdvisorSearch.Node node, Consumer<AdvisorSearch.Node> accept) {
        List<String> keys = new ArrayList<>(node.slots().keySet());
        generateDrifMoves(node, accept, keys);
        for (String key : keys) {
            if (!search.running()) return;
            if (model.locked(key)) continue;
            SlotData slot = node.slots().get(key);
            var allowed = search.options.getAllowedChanges();
            if (allowed.isStars() && !node.changed().contains("stars:" + key)) {
                for (int star = stars(slot) + 1; star <= 9 && search.running(); star++) {
                    SlotData next = copySlot(slot);
                    next.setItemStars(star);
                    emit(
                            node,
                            key,
                            next,
                            starLabel(key, slot, star),
                            "stars:" + key,
                            star - stars(slot),
                            accept);
                }
            }
            if (allowed.isOrbs()) orbChanges(node, key, slot, accept);
            if (model.special(slot)) continue;
            if (allowed.isDrifs() || allowed.isDrifUpgrades()) drifChanges(node, key, slot, accept);
            if (allowed.isItems() && !node.changed().contains("item:" + key))
                itemChanges(node, key, slot, accept);
        }
    }

    private void generateDrifMoves(
            AdvisorSearch.Node node, Consumer<AdvisorSearch.Node> accept, List<String> keys) {
        for (int a = 0; a < keys.size() && search.running(); a++) {
            String leftKey = keys.get(a);
            SlotData left = node.slots().get(leftKey);
            for (int b = a + 1; b < keys.size() && search.running(); b++) {
                String rightKey = keys.get(b);
                SlotData right = node.slots().get(rightKey);
                for (int i = 0; i < model.maxDrifs(left) && search.running(); i++) {
                    if (!model.movable(leftKey, left, i)) continue;
                    for (int j = 0; j < model.maxDrifs(right) && search.running(); j++) {
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
                        accept.accept(
                                child(
                                        node,
                                        next,
                                        moveLabel(leftKey, left, i, rightKey, right, j),
                                        null,
                                        0,
                                        0));
                    }
                }
            }
        }
    }

    private void drifChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        for (int i = 0; i < model.maxDrifs(slot) && search.running(); i++) {
            if (!model.movable(key, slot, i) || node.changed().contains("drif:" + key + ":" + i))
                continue;
            Long current = id(slot, i);
            if (current != null && search.options.getAllowedChanges().isDrifUpgrades()) {
                DrifTemplate drif = model.templates.drifs().get(current);
                for (int nextLevel = level(slot, i) + 1;
                        nextLevel <= drif.getSize().getMaxLevel() && search.running();
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
            } else if (current == null && search.options.getAllowedChanges().isDrifs()) {
                for (DrifTemplate drif : model.templates.drifs().values()) {
                    if (!search.running()) return;
                    if (drif.getBonusType() != search.options.getGoal()
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

    private void orbChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        int max = model.item(slot).getRarity() == RARITY.LEGENDARY ? 2 : 1;
        for (int i = 0; i < max && search.running(); i++) {
            if (node.changed().contains("orb:" + key + ":" + i)) continue;
            for (OrbTemplate orb : model.templates.orbs().values()) {
                if (!search.running()) return;
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

    private void itemChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        for (ItemTemplate replacement :
                replacements.computeIfAbsent(key, ignored -> itemCandidates(key, slot))) {
            if (!search.running()) return;
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

    private List<ItemTemplate> itemCandidates(String key, SlotData slot) {
        String selected = selectedProfile();
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

    private String selectedProfile() {
        if (!"AUTO".equals(search.options.getProfession())) return search.options.getProfession();
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
            physical += character.getOrDefault("Siła", 0) + character.getOrDefault("Zręczność", 0);
        }
        return magical == physical ? "UNIVERSAL" : magical > physical ? "MAGICAL" : "PHYSICAL";
    }

    private void emit(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            String label,
            String change,
            int effort,
            Consumer<AdvisorSearch.Node> accept) {
        if (!search.running()) return;
        Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
        next.put(key, slot);
        if (model.valid(next)) accept.accept(child(node, next, label, change, 1, effort));
    }

    private AdvisorSearch.Node child(
            AdvisorSearch.Node parent,
            Map<String, SlotData> slots,
            String label,
            String change,
            int upgrades,
            int effort) {
        List<String> actions = new ArrayList<>(parent.actions());
        actions.add(label);
        Set<String> changed = new HashSet<>(parent.changed());
        if (change != null) changed.add(change);
        return new AdvisorSearch.Node(
                slots,
                null,
                actions,
                changed,
                parent.upgrades() + upgrades,
                parent.effort() + effort);
    }

    private String moveLabel(
            String leftKey, SlotData left, int i, String rightKey, SlotData right, int j) {
        Long first = id(left, i), second = id(right, j);
        if (first == null)
            return "Przenieś "
                    + drifLabel(second, level(right, j))
                    + " z "
                    + location(rightKey, j)
                    + " do "
                    + location(leftKey, i);
        if (second == null)
            return "Przenieś "
                    + drifLabel(first, level(left, i))
                    + " z "
                    + location(leftKey, i)
                    + " do "
                    + location(rightKey, j);
        return "Zamień "
                + drifLabel(first, level(left, i))
                + " ("
                + location(leftKey, i)
                + ") z "
                + drifLabel(second, level(right, j))
                + " ("
                + location(rightKey, j)
                + ")";
    }

    private String starLabel(String key, SlotData slot, int star) {
        return "Podnieś "
                + slotName(key)
                + " ("
                + model.item(slot).getName()
                + ") z "
                + stars(slot)
                + "★ do "
                + star
                + "★";
    }

    private String drifLabel(Long id, int level) {
        DrifTemplate drif = model.templates.drifs().get(id);
        return drif.getSize() + " " + drif.getName() + " " + level;
    }

    private static String location(String key, int index) {
        return slotName(key) + ", gniazdo " + (index + 1);
    }
}
