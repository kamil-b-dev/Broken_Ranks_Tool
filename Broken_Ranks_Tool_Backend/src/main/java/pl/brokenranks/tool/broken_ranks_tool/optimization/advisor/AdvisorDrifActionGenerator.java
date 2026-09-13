package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSearch.slotName;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorSlotData.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Generates moves, purchases, and upgrades involving drifs. */
final class AdvisorDrifActionGenerator {
    private static final int[] PURCHASE_LEVELS = {1, 6, 11, 16, 21};

    private final AdvisorSearch search;
    private final AdvisorEquipmentModel model;
    private final AdvisorNodeFactory nodes;

    AdvisorDrifActionGenerator(AdvisorSearch search, AdvisorNodeFactory nodes) {
        this.search = search;
        this.model = search.model;
        this.nodes = nodes;
    }

    void generateMoves(
            AdvisorSearch.Node node, List<String> keys, Consumer<AdvisorSearch.Node> accept) {
        for (int leftIndex = 0; leftIndex < keys.size() && search.running(); leftIndex++) {
            String leftKey = keys.get(leftIndex);
            SlotData left = node.slots().get(leftKey);
            for (int rightIndex = leftIndex + 1;
                    rightIndex < keys.size() && search.running();
                    rightIndex++) {
                String rightKey = keys.get(rightIndex);
                SlotData right = node.slots().get(rightKey);
                generateMovesBetween(node, leftKey, left, rightKey, right, accept);
            }
        }
    }

    private void generateMovesBetween(
            AdvisorSearch.Node node,
            String leftKey,
            SlotData left,
            String rightKey,
            SlotData right,
            Consumer<AdvisorSearch.Node> accept) {
        for (int leftSocket = 0;
                leftSocket < model.maxDrifs(left) && search.running();
                leftSocket++) {
            if (!model.movable(leftKey, left, leftSocket)) continue;
            for (int rightSocket = 0;
                    rightSocket < model.maxDrifs(right) && search.running();
                    rightSocket++) {
                if (!model.movable(rightKey, right, rightSocket)) continue;
                Long first = id(left, leftSocket);
                Long second = id(right, rightSocket);
                if (Objects.equals(first, second)
                        && (first == null || level(left, leftSocket) == level(right, rightSocket)))
                    continue;
                SlotData nextLeft = placed(left, leftSocket, second, level(right, rightSocket));
                SlotData nextRight = placed(right, rightSocket, first, level(left, leftSocket));
                if (!model.validSlot(leftKey, nextLeft) || !model.validSlot(rightKey, nextRight))
                    continue;
                Map<String, SlotData> next = new LinkedHashMap<>(node.slots());
                next.put(leftKey, nextLeft);
                next.put(rightKey, nextRight);
                accept.accept(
                        nodes.child(
                                node,
                                next,
                                moveLabel(leftKey, left, leftSocket, rightKey, right, rightSocket),
                                null,
                                0,
                                0));
            }
        }
    }

    void generateChanges(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            Consumer<AdvisorSearch.Node> accept) {
        for (int index = 0; index < model.maxDrifs(slot) && search.running(); index++) {
            if (!model.movable(key, slot, index)
                    || node.changed().contains("drif:" + key + ":" + index)) continue;
            Long current = id(slot, index);
            if (current != null && search.options.getAllowedChanges().isDrifUpgrades())
                generateUpgrades(node, key, slot, index, current, accept);
            else if (current == null && search.options.getAllowedChanges().isDrifs())
                generatePurchases(node, key, slot, index, accept);
        }
    }

    private void generateUpgrades(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            int index,
            Long current,
            Consumer<AdvisorSearch.Node> accept) {
        DrifTemplate drif = model.templates.drifs().get(current);
        for (int nextLevel = level(slot, index) + 1;
                nextLevel <= drif.getSize().getMaxLevel() && search.running();
                nextLevel++) {
            nodes.emit(
                    node,
                    key,
                    placed(slot, index, current, nextLevel),
                    "Ulepsz "
                            + drifLabel(current, level(slot, index))
                            + " w "
                            + location(key, index)
                            + " do poziomu "
                            + nextLevel,
                    "drif:" + key + ":" + index,
                    nextLevel - level(slot, index),
                    accept);
        }
    }

    private void generatePurchases(
            AdvisorSearch.Node node,
            String key,
            SlotData slot,
            int index,
            Consumer<AdvisorSearch.Node> accept) {
        for (DrifTemplate drif : model.templates.drifs().values()) {
            if (!search.running()) return;
            if (drif.getBonusType() != search.options.getGoal()
                    || !model.placement.isValidDrifSizeForTier(drif, model.item(slot))) continue;
            for (int nextLevel : PURCHASE_LEVELS) {
                if (nextLevel > drif.getSize().getMaxLevel()) continue;
                nodes.emit(
                        node,
                        key,
                        placed(slot, index, drif.getId(), nextLevel),
                        "Dodaj "
                                + drifLabel(drif.getId(), nextLevel)
                                + " do "
                                + location(key, index),
                        "drif:" + key + ":" + index,
                        1,
                        accept);
            }
        }
    }

    private String moveLabel(
            String leftKey,
            SlotData left,
            int leftSocket,
            String rightKey,
            SlotData right,
            int rightSocket) {
        Long first = id(left, leftSocket);
        Long second = id(right, rightSocket);
        if (first == null)
            return "Przenieś "
                    + drifLabel(second, level(right, rightSocket))
                    + " z "
                    + location(rightKey, rightSocket)
                    + " do "
                    + location(leftKey, leftSocket);
        if (second == null)
            return "Przenieś "
                    + drifLabel(first, level(left, leftSocket))
                    + " z "
                    + location(leftKey, leftSocket)
                    + " do "
                    + location(rightKey, rightSocket);
        return "Zamień "
                + drifLabel(first, level(left, leftSocket))
                + " ("
                + location(leftKey, leftSocket)
                + ") z "
                + drifLabel(second, level(right, rightSocket))
                + " ("
                + location(rightKey, rightSocket)
                + ")";
    }

    private String drifLabel(Long id, int level) {
        DrifTemplate drif = model.templates.drifs().get(id);
        return drif.getSize() + " " + drif.getName() + " " + level;
    }

    private static String location(String key, int index) {
        return slotName(key) + ", gniazdo " + (index + 1);
    }
}
